"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Trash2Icon } from "lucide-react"
import { apolloClient } from "@/modules/auth/utils/apollo-client"
import {
  ADMIN_CONFIGS_QUERY,
  CREATE_ADMIN_CONFIG_MUTATION,
  DELETE_ADMIN_CONFIG_MUTATION,
  UPDATE_ADMIN_CONFIG_MUTATION
} from "@/modules/admin/graphql/operations/admin"
import type { AdminConfigItem, AdminConfigsQueryResponse } from "@/modules/admin/types/admin-graphql"
import { Button } from "@/shadcn-ui-kit/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card"
import { Input } from "@/shadcn-ui-kit/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shadcn-ui-kit/ui/table"
import { Spinner } from "@/shadcn-ui-kit/ui/spinner"

interface DraftState {
  value: string
  description: string
}

interface CreateConfigFormState {
  key: string
  value: string
  description: string
}

function toDraftMap(configs: AdminConfigItem[]): Record<string, DraftState> {
  return configs.reduce<Record<string, DraftState>>((acc, config) => {
    acc[config.id] = {
      value: config.value,
      description: config.description ?? ""
    }
    return acc
  }, {})
}

export function AdminConfigsPage() {
  const [configs, setConfigs] = useState<AdminConfigItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState<CreateConfigFormState>({
    key: "",
    value: "",
    description: ""
  })

  const hasCreateInput = useMemo(
    () => createForm.key.trim() && createForm.value.trim(),
    [createForm.key, createForm.value]
  )

  useEffect(() => {
    void refreshConfigs()
  }, [])

  async function refreshConfigs() {
    setIsLoading(true)
    try {
      const { data } = await apolloClient.query<AdminConfigsQueryResponse>({
        query: ADMIN_CONFIGS_QUERY,
        fetchPolicy: "network-only"
      })
      const rows = data?.configs ?? []
      setConfigs(rows)
      setDrafts(toDraftMap(rows))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load configs"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDraftValueChange(id: string, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        value,
        description: prev[id]?.description ?? ""
      }
    }))
  }

  function handleDraftDescriptionChange(id: string, description: string) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        value: prev[id]?.value ?? "",
        description
      }
    }))
  }

  async function handleCreateConfig() {
    if (!hasCreateInput || isSubmitting) return

    setIsSubmitting(true)
    try {
      await apolloClient.mutate({
        mutation: CREATE_ADMIN_CONFIG_MUTATION,
        variables: {
          input: {
            key: createForm.key.trim(),
            value: createForm.value,
            description: createForm.description || null
          }
        }
      })
      setCreateForm({ key: "", value: "", description: "" })
      await refreshConfigs()
      toast.success("Config created")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create config"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSaveRow(configId: string) {
    const draft = drafts[configId]
    if (!draft || isSubmitting) return

    setIsSubmitting(true)
    try {
      await apolloClient.mutate({
        mutation: UPDATE_ADMIN_CONFIG_MUTATION,
        variables: {
          id: configId,
          input: {
            value: draft.value,
            description: draft.description || null
          }
        }
      })
      await refreshConfigs()
      toast.success("Config updated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update config"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteRow(configId: string) {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await apolloClient.mutate({
        mutation: DELETE_ADMIN_CONFIG_MUTATION,
        variables: {
          id: configId
        }
      })
      await refreshConfigs()
      toast.success("Config deleted")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete config"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Configs</CardTitle>
        <CardDescription>Runtime server configs with inline edit. Key is immutable after creation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_auto]">
          <Input
            placeholder="key"
            value={createForm.key}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, key: event.target.value }))}
          />
          <Input
            placeholder="value"
            value={createForm.value}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, value: event.target.value }))}
          />
          <Input
            placeholder="description"
            value={createForm.description}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <Button disabled={!hasCreateInput || isSubmitting} onClick={handleCreateConfig}>
            Add
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Key</TableHead>
                <TableHead className="w-[28%]">Value</TableHead>
                <TableHead className="w-[28%]">Description</TableHead>
                <TableHead className="w-[16%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="size-5" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading && configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No configs
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading
                ? configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-mono text-xs">{config.key}</TableCell>
                      <TableCell>
                        <Input
                          value={drafts[config.id]?.value ?? ""}
                          onChange={(event) => handleDraftValueChange(config.id, event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={drafts[config.id]?.description ?? ""}
                          onChange={(event) =>
                            handleDraftDescriptionChange(config.id, event.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" disabled={isSubmitting} onClick={() => handleSaveRow(config.id)}>
                            Save
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            disabled={isSubmitting}
                            onClick={() => handleDeleteRow(config.id)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
