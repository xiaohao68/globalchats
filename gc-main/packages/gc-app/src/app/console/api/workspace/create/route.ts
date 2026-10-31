import { NextRequest, NextResponse } from "next/server";
import { setConsoleAuthCookies } from "@/app/console/api/_lib/auth-cookies";
import { mapGraphQLErrorToHttpResponse } from "@/app/console/api/_lib/graphql-error";
import { ACCESS_TOKEN_KEY } from "@/modules/auth/constants/auth-storage";

interface CreateWorkspaceInput {
  displayName: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as CreateWorkspaceInput;
    const displayName = body.displayName?.trim();

    if (!displayName) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const currentToken = request.cookies.get(ACCESS_TOKEN_KEY)?.value;
    if (!currentToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const graphqlResponse = await fetch(new URL("/graphql", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({
        query: `
          mutation CreateWorkspace($input: CreateWorkspaceInput!) {
            createWorkspace(input: $input) {
              id
              displayName
              logo
              role
              accessToken
            }
          }
        `,
        variables: {
          input: { displayName },
        },
      }),
    });

    const graphqlData = (await graphqlResponse.json()) as {
      data?: {
        createWorkspace?: {
          id: string;
          displayName: string;
          logo?: string | null;
          role: string;
          accessToken: string;
        };
      };
      errors?: Array<{ message?: string; extensions?: { code?: string } }>;
    };

    if (graphqlData.errors?.length) {
      const { error, status } = mapGraphQLErrorToHttpResponse(graphqlData.errors, "Create workspace failed");
      return NextResponse.json({ error }, { status });
    }

    const workspace = graphqlData.data?.createWorkspace;
    if (!workspace?.accessToken) {
      return NextResponse.json({ error: "Invalid response from server" }, { status: 500 });
    }

    await setConsoleAuthCookies(request, workspace.accessToken);

    return NextResponse.json({ success: true, workspace });
  } catch (error) {
    console.error("Create workspace API error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
