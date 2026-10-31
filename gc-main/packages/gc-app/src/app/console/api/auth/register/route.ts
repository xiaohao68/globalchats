import { NextRequest, NextResponse } from "next/server";
import { setConsoleAuthCookies } from "@/app/console/api/_lib/auth-cookies";
import { mapGraphQLErrorToHttpResponse } from "@/app/console/api/_lib/graphql-error";

interface RegisterInput {
  email: string;
  password: string;
  username?: string;
  inviteCode?: string;
  avatar?: string;
  captchaToken?: string;
  verificationCode?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as RegisterInput;
    const { email, password, username, inviteCode, avatar, captchaToken, verificationCode } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const graphqlResponse = await fetch(new URL("/graphql", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              accessToken
              user {
                id
                email
                username
                avatar
              }
              workspaces {
                id
                displayName
                logo
                role
                accessToken
              }
              requiresSelection
            }
          }
        `,
        variables: {
          input: {
            email,
            password,
            ...(username ? { username } : {}),
            ...(inviteCode ? { inviteCode } : {}),
            ...(avatar ? { avatar } : {}),
            ...(captchaToken ? { captchaToken } : {}),
            ...(verificationCode ? { verificationCode } : {}),
          },
        },
      }),
    });

    const graphqlData = (await graphqlResponse.json()) as {
      data?: {
        register?: {
          accessToken: string;
          user: { id: string; email: string; username?: string | null; avatar?: string | null };
          workspaces: Array<{ id: string; displayName: string; logo?: string | null; role: string; accessToken: string }>;
          requiresSelection: boolean;
        };
      };
      errors?: Array<{ message?: string; extensions?: { code?: string } }>;
    };

    if (graphqlData.errors?.length) {
      const { error, status } = mapGraphQLErrorToHttpResponse(graphqlData.errors, "Register failed");
      return NextResponse.json({ error }, { status });
    }

    const registerResult = graphqlData.data?.register;
    if (!registerResult?.accessToken) {
      return NextResponse.json({ error: "Invalid response from server" }, { status: 500 });
    }

    await setConsoleAuthCookies(request, registerResult.accessToken);

    return NextResponse.json({
      success: true,
      user: registerResult.user,
      workspaces: registerResult.workspaces,
      requiresSelection: registerResult.requiresSelection,
    });
  } catch (error) {
    console.error("Register API error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
