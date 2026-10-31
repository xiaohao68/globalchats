import { NextRequest, NextResponse } from "next/server";
import { setConsoleAuthCookies } from "@/app/console/api/_lib/auth-cookies";
import { mapGraphQLErrorToHttpResponse } from "@/app/console/api/_lib/graphql-error";

interface LoginInput {
  email: string;
  password: string;
  captchaToken?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as LoginInput;
    const { email, password, captchaToken } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const graphqlResponse = await fetch(new URL("/graphql", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation Login($input: LoginInput!) {
            login(input: $input) {
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
            ...(captchaToken ? { captchaToken } : {}),
          },
        },
      }),
    });

    const graphqlData = (await graphqlResponse.json()) as {
      data?: {
        login?: {
          accessToken: string;
          user: { id: string; email: string; username?: string | null; avatar?: string | null };
          workspaces: Array<{ id: string; displayName: string; logo?: string | null; role: string; accessToken: string }>;
          requiresSelection: boolean;
        };
      };
      errors?: Array<{ message?: string; extensions?: { code?: string } }>;
    };

    if (graphqlData.errors?.length) {
      const { error, status } = mapGraphQLErrorToHttpResponse(graphqlData.errors, "Login failed");
      return NextResponse.json({ error }, { status });
    }

    const loginResult = graphqlData.data?.login;
    if (!loginResult?.accessToken) {
      return NextResponse.json({ error: "Invalid response from server" }, { status: 500 });
    }

    await setConsoleAuthCookies(request, loginResult.accessToken);

    return NextResponse.json({
      success: true,
      user: loginResult.user,
      workspaces: loginResult.workspaces,
      requiresSelection: loginResult.requiresSelection,
    });
  } catch (error) {
    console.error("Login API error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
