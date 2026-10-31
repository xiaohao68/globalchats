"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { CircleUserRound, Trash2 } from "lucide-react";

import { Button } from "@/shadcn-ui-kit/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn-ui-kit/ui/form";
import { Input } from "@/shadcn-ui-kit/ui/input";
import { Card, CardContent } from "@/shadcn-ui-kit/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shadcn-ui-kit/ui/avatar";
import { Textarea } from "@/shadcn-ui-kit/ui/textarea";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth";
import {
  UPDATE_WORKSPACE_MEMBER_MUTATION,
  WORKSPACE_MEMBERS_QUERY,
} from "@/modules/workspace/graphql/operations/workspace-member";

const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, {
      message: "Name is required.",
    })
    .max(50, {
      message: "Name must not be longer than 50 characters.",
    }),
  email: z.string().email().or(z.literal("")),
  bio: z.string().max(160, {
    message: "Bio must not be longer than 160 characters.",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const defaultValues: Partial<ProfileFormValues> = {
  name: "",
  email: "",
  bio: "",
};

interface MeQueryResponse {
  me: {
    id: string;
    email: string;
  } | null;
}

interface WorkspaceMembersQueryResponse {
  workspace: {
    members: {
      id: string;
      userId: string | null;
      email: string;
      name?: string | null;
      bio?: string | null;
    }[];
  } | null;
}

interface UpdateWorkspaceMemberMutationResponse {
  workspace: {
    updateMember: {
      id: string;
      email: string;
      name?: string | null;
      bio?: string | null;
    };
  } | null;
}

export default function Page() {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const [currentWorkspaceMemberId, setCurrentWorkspaceMemberId] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const [{ data: meData }, { data: workspaceData }] = await Promise.all([
          apolloClient.query<MeQueryResponse>({
            query: ME_QUERY,
            fetchPolicy: "network-only",
          }),
          apolloClient.query<WorkspaceMembersQueryResponse>({
            query: WORKSPACE_MEMBERS_QUERY,
            fetchPolicy: "network-only",
          }),
        ]);

        const me = meData?.me;
        const members = workspaceData?.workspace?.members || [];
        const currentMember =
          (me?.id ? members.find((member) => member.userId === me.id) : undefined) || members[0];

        if (!currentMember?.id) {
          throw new Error("Current workspace member not found");
        }

        const resolvedName = currentMember.name?.trim() || "";
        const resolvedEmail = currentMember.email?.trim() || me?.email?.trim() || "";
        const resolvedBio = currentMember.bio?.trim() || "";

        if (!mounted) return;

        setCurrentWorkspaceMemberId(currentMember.id);
        form.reset({
          name: resolvedName,
          email: resolvedEmail,
          bio: resolvedBio,
        });
        setLoadError(null);
      } catch (error) {
        if (!mounted) return;
        setCurrentWorkspaceMemberId(null);
        setLoadError(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        if (!mounted) return;
        setIsLoadingProfile(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [form]);

  async function onSubmit(data: ProfileFormValues) {
    if (!currentWorkspaceMemberId) {
      toast.error("Current workspace member not found");
      return;
    }

    try {
      const { data: mutationData } =
        await apolloClient.mutate<UpdateWorkspaceMemberMutationResponse>({
          mutation: UPDATE_WORKSPACE_MEMBER_MUTATION,
          variables: {
            input: {
              workspaceMemberId: currentWorkspaceMemberId,
              name: data.name.trim(),
              bio: data.bio,
            },
          },
        });

      const updatedMember = mutationData?.workspace?.updateMember;
      if (updatedMember) {
        form.reset({
          name: updatedMember.name?.trim() || "",
          email: updatedMember.email?.trim() || form.getValues("email"),
          bio: updatedMember.bio || "",
        });
      }

      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    }
  }

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setAvatarFileName(file.name);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFileName(null);
  };

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

            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 align-top">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarPreview || undefined} />
                  <AvatarFallback>
                    <CircleUserRound className="opacity-45" />
                  </AvatarFallback>
                </Avatar>
                <div className="relative flex gap-2">
                  <Button type="button" onClick={() => document.getElementById("avatar-upload")?.click()}>
                    {avatarFileName ? "Change image" : "Upload image"}
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Upload image file"
                    tabIndex={-1}
                    onChange={handleAvatarChange}
                  />
                  {avatarFileName && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={handleRemoveAvatar}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is your public display name inside the current workspace.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly disabled />
                  </FormControl>
                  <FormDescription>
                    Email is read from your linked user account and cannot be changed here.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us a little bit about yourself"
                      className="resize-none"
                      maxLength={160}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Short profile for this workspace (max 160 characters).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isLoadingProfile || !currentWorkspaceMemberId || form.formState.isSubmitting}
            >
              {isLoadingProfile ? "Loading..." : "Update profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
