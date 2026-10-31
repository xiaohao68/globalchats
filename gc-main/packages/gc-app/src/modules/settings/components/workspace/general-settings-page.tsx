"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { CircleUserRound, Trash2 } from "lucide-react";

import { apolloClient } from "@/modules/auth/utils/apollo-client";
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth";
import { useFileUpload } from "@/shadcn-ui-kit/hooks/use-file-upload";
import { Button } from "@/shadcn-ui-kit/ui/button";
import { Card, CardContent } from "@/shadcn-ui-kit/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shadcn-ui-kit/ui/avatar";
import { Input } from "@/shadcn-ui-kit/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn-ui-kit/ui/form";
import { UPDATE_WORKSPACE_GENERAL_MUTATION } from "@/modules/workspace/graphql/operations/workspace-member";

const workspaceGeneralFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: "Workspace name is required." })
    .max(50, { message: "Workspace name must not be longer than 50 characters." }),
});

type WorkspaceGeneralFormValues = z.infer<typeof workspaceGeneralFormSchema>;
type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

interface MeQueryResponse {
  me: {
    currentWorkspace: {
      id: string;
      displayName?: string | null;
      logo?: string | null;
      role?: WorkspaceRole | null;
    } | null;
  } | null;
}

interface UpdateWorkspaceGeneralMutationResponse {
  workspace: {
    updateGeneral: {
      id: string;
      displayName?: string | null;
      logo?: string | null;
    } | null;
  } | null;
}

const defaultValues: WorkspaceGeneralFormValues = {
  displayName: "",
};

export function GeneralSettingsPage() {
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [{ files }, { removeFile, openFileDialog, getInputProps }] = useFileUpload({
    accept: "image/*",
    maxFiles: 1,
    multiple: false,
  });

  const form = useForm<WorkspaceGeneralFormValues>({
    resolver: zodResolver(workspaceGeneralFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    let mounted = true;

    async function loadWorkspaceGeneral() {
      setIsLoadingWorkspace(true);
      try {
        const { data } = await apolloClient.query<MeQueryResponse>({
          query: ME_QUERY,
          fetchPolicy: "network-only",
        });

        const workspace = data?.me?.currentWorkspace;
        if (!workspace?.id) {
          throw new Error("Current workspace not found");
        }

        if (!mounted) return;

        form.reset({
          displayName: workspace.displayName?.trim() || "",
        });
        setWorkspaceRole(workspace.role || null);
        setWorkspaceLogo(workspace.logo || null);
        setLoadError(null);
      } catch (error) {
        if (!mounted) return;
        setWorkspaceRole(null);
        setLoadError(error instanceof Error ? error.message : "Failed to load workspace settings");
      } finally {
        if (!mounted) return;
        setIsLoadingWorkspace(false);
      }
    }

    void loadWorkspaceGeneral();

    return () => {
      mounted = false;
    };
  }, [form]);

  const canEditWorkspace = useMemo(
    () => workspaceRole === "OWNER" || workspaceRole === "ADMIN",
    [workspaceRole],
  );

  const selectedFileName = useMemo(() => {
    const firstFile = files[0]?.file;
    if (!firstFile) return null;
    if (firstFile instanceof File) return firstFile.name;
    return null;
  }, [files]);

  const logoPreview = useMemo(
    () => files[0]?.preview || workspaceLogo || undefined,
    [files, workspaceLogo],
  );

  async function onSubmit(data: WorkspaceGeneralFormValues) {
    setSubmitError(null);

    if (!canEditWorkspace) {
      const message = "Only workspace owner or admin can update workspace settings";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    try {
      const { data: mutationData } =
        await apolloClient.mutate<UpdateWorkspaceGeneralMutationResponse>({
          mutation: UPDATE_WORKSPACE_GENERAL_MUTATION,
          variables: {
            input: {
              displayName: data.displayName.trim(),
            },
          },
        });

      const updatedWorkspace = mutationData?.workspace?.updateGeneral;
      if (!updatedWorkspace?.id) {
        throw new Error("Failed to update workspace settings");
      }

      const nextDisplayName = updatedWorkspace.displayName?.trim() || data.displayName.trim();
      form.reset({ displayName: nextDisplayName });
      setWorkspaceLogo(updatedWorkspace.logo || null);
      toast.success("Workspace settings updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update workspace settings";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {loadError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {loadError}
              </div>
            ) : null}

            {submitError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 align-top">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={logoPreview} />
                  <AvatarFallback>
                    <CircleUserRound className="opacity-45" />
                  </AvatarFallback>
                </Avatar>
                <div className="relative flex gap-2">
                  <Button type="button" onClick={openFileDialog}>
                    {selectedFileName ? "Change image" : "Upload image"}
                  </Button>
                  <input
                    {...getInputProps()}
                    className="sr-only"
                    aria-label="Upload workspace logo file"
                    tabIndex={-1}
                  />
                  {files[0]?.id ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={() => removeFile(files[0].id)}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                Logo upload is placeholder for now and is not saved yet.
              </p>
              {selectedFileName ? (
                <p className="text-muted-foreground text-sm">Selected file: {selectedFileName}</p>
              ) : null}
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Workspace"
                      {...field}
                      readOnly={!canEditWorkspace}
                      disabled={isLoadingWorkspace}
                    />
                  </FormControl>
                  <FormDescription>
                    {canEditWorkspace
                      ? "This name is visible to all members in the current workspace."
                      : "Only workspace owner or admin can edit this name."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={
                isLoadingWorkspace ||
                !canEditWorkspace ||
                form.formState.isSubmitting ||
                !form.formState.isValid
              }
            >
              {isLoadingWorkspace ? "Loading..." : "Update workspace"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
