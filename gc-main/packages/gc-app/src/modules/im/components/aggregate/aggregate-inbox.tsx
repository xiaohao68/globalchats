"use client"

import * as React from "react"
import { MessageSquareMoreIcon, RefreshCcwIcon } from "lucide-react"
import { toast } from "sonner"
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth"
import { apolloClient } from "@/modules/auth/utils/apollo-client"
import { Badge } from "@/shadcn-ui-kit/ui/badge"
import { Button } from "@/shadcn-ui-kit/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card"
import { Input } from "@/shadcn-ui-kit/ui/input"
import { ScrollArea } from "@/shadcn-ui-kit/ui/scroll-area"
import { Separator } from "@/shadcn-ui-kit/ui/separator"
import { Skeleton } from "@/shadcn-ui-kit/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/shadcn-ui-kit/ui/tabs"
import { Textarea } from "@/shadcn-ui-kit/ui/textarea"
import { WORKSPACE_MEMBERS_QUERY } from "@/modules/im/graphql/operations/im-whatsapp"
import { createImRealtimeClient } from "@/modules/im/utils/im-realtime-client"
import { resolveCurrentWorkspaceMember } from "@/modules/settings/utils/current-workspace-member"
import {
  AGGREGATE_PROVIDER_THEMES,
  AggregateConversationListItem,
  AggregateMessageItem,
  AggregateScope,
} from "@/modules/im/types/aggregate"
import { WorkspaceMember, WorkspaceMembersData } from "@/modules/im/types/whatsapp"
import {
  resolveAggregateScope,
  whatsappAggregateAdapter,
} from "@/modules/im/utils/whatsapp-aggregate-adapter"
import { cn } from "@/lib/utils"

interface MeAggregateQueryResponse {
  me: {
    id: string
    currentWorkspace: {
      id: string
      role: string
    } | null
  } | null
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getMemberLabel(member?: WorkspaceMember | null) {
  if (!member) return "Unassigned"
  if (member.name?.trim()) return member.name
  return member.email
}

function getConversationAssigneeId(conversation: AggregateConversationListItem) {
  return conversation.conversationAssigneeMemberId || conversation.accountAssigneeMemberId || null
}

function isConversationAssignedToCurrentMember(
  conversation: AggregateConversationListItem,
  currentMemberId?: string | null,
) {
  if (!currentMemberId) return false
  return getConversationAssigneeId(conversation) === currentMemberId
}

function isWorkspaceManager(role?: string | null) {
  return role === "ADMIN" || role === "OWNER"
}

function ConversationRow({
  conversation,
  isActive,
  isOwnedByCurrentMember,
  assignee,
  onSelect,
}: {
  conversation: AggregateConversationListItem
  isActive: boolean
  isOwnedByCurrentMember: boolean
  assignee?: WorkspaceMember | null
  onSelect: () => void
}) {
  const theme = AGGREGATE_PROVIDER_THEMES[conversation.provider]
  const isInbound = conversation.lastMessageDirection === "inbound"

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-xl border p-3 text-left transition hover:bg-accent/50",
        theme.surfaceClassName,
        isActive && "border-primary bg-accent/60 shadow-sm",
        !isOwnedByCurrentMember && "border-orange-300/60"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{conversation.title}</span>
            <Badge variant="outline" className={theme.accentClassName}>
              {theme.badgeLabel}
            </Badge>
            {!isOwnedByCurrentMember ? <Badge variant="warning">Assigned to others</Badge> : null}
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {conversation.lastMessagePreview || conversation.summary}
          </p>
        </div>
        <div className="space-y-2 text-right text-xs text-muted-foreground">
          <div>{formatDateTime(conversation.lastMessageAt || conversation.updatedAt)}</div>
          <div className="flex items-center justify-end gap-1">
            <Badge variant={isInbound ? "secondary" : "default"}>
              {isInbound ? "Inbound" : "Outbound"}
            </Badge>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{conversation.conversationJid}</span>
        <span className="truncate">{getMemberLabel(assignee)}</span>
      </div>
    </button>
  )
}

function MessageRow({ message }: { message: AggregateMessageItem }) {
  const isOutbound = message.direction === "outbound"

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 shadow-xs",
          isOutbound
            ? "border-primary/20 bg-primary text-primary-foreground"
            : "bg-card text-card-foreground"
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-[11px] opacity-80">
          <Badge variant={isOutbound ? "secondary" : "outline"}>
            {isOutbound ? "Sent" : "Received"}
          </Badge>
          <span>{formatDateTime(message.createdAt)}</span>
          {message.status ? <span>{message.status}</span> : null}
        </div>
        <p className="break-words text-sm leading-6">{message.preview || "Unsupported message"}</p>
        <div className="mt-2 text-[11px] opacity-70">
          {message.senderId || message.remoteJid}
        </div>
      </div>
    </div>
  )
}

export default function AggregateInbox() {
  const adapter = whatsappAggregateAdapter
  const [members, setMembers] = React.useState<WorkspaceMember[]>([])
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null)
  const [workspaceRole, setWorkspaceRole] = React.useState<string | null>(null)
  const [scope, setScope] = React.useState<AggregateScope>("MINE")
  const [search, setSearch] = React.useState("")
  const deferredSearch = React.useDeferredValue(search)
  const [conversations, setConversations] = React.useState<AggregateConversationListItem[]>([])
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<AggregateMessageItem[]>([])
  const [draftMessage, setDraftMessage] = React.useState("")
  const [isBootstrapping, setIsBootstrapping] = React.useState(true)
  const [isLoadingConversations, setIsLoadingConversations] = React.useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false)
  const [isSendingMessage, setIsSendingMessage] = React.useState(false)
  const [selectionNotice, setSelectionNotice] = React.useState<string | null>(null)

  const currentMember = React.useMemo(
    () => resolveCurrentWorkspaceMember(members, currentUserId),
    [members, currentUserId],
  )
  const currentMemberId = currentMember?.id || null
  const isManager = isWorkspaceManager(workspaceRole)
  const effectiveScope = resolveAggregateScope({
    isWorkspaceManager: isManager,
    scope,
  })

  const memberById = React.useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  )

  const selectedConversation = React.useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.conversationId === selectedConversationId,
      ) || null,
    [conversations, selectedConversationId],
  )
  const canSendSelectedConversation = React.useMemo(() => {
    if (!selectedConversation) return false
    return isManager || isConversationAssignedToCurrentMember(selectedConversation, currentMemberId)
  }, [currentMemberId, isManager, selectedConversation])

  const loadConversations = React.useCallback(async () => {
    setIsLoadingConversations(true)

    try {
      const nextConversations = await adapter.listConversations({
        scope: effectiveScope,
        search: deferredSearch.trim(),
        limit: 100,
      })
      setConversations(nextConversations)
      setSelectionNotice(null)

      setSelectedConversationId((currentSelectedConversationId) => {
        if (
          currentSelectedConversationId &&
          nextConversations.some(
            (conversation) => conversation.conversationId === currentSelectedConversationId,
          )
        ) {
          return currentSelectedConversationId
        }

        if (currentSelectedConversationId && nextConversations.length > 0) {
          setSelectionNotice("当前会话在这个视图里已不可见，已切换到新的会话。")
        }

        return nextConversations[0]?.conversationId || null
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load inbox")
    } finally {
      setIsLoadingConversations(false)
    }
  }, [adapter, deferredSearch, effectiveScope])

  const loadMessages = React.useCallback(
    async (conversationId: string) => {
      setIsLoadingMessages(true)

      try {
        const nextMessages = await adapter.listMessages({
          conversationId,
          scope: effectiveScope,
          limit: 100,
        })
        setMessages(nextMessages)
      } catch (error) {
        setMessages([])
        toast.error(error instanceof Error ? error.message : "Failed to load messages")
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [adapter, effectiveScope],
  )

  React.useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      try {
        const [{ data: meData }, { data: membersData }] = await Promise.all([
          apolloClient.query<MeAggregateQueryResponse>({
            query: ME_QUERY,
            fetchPolicy: "network-only",
          }),
          apolloClient.query<WorkspaceMembersData>({
            query: WORKSPACE_MEMBERS_QUERY,
            fetchPolicy: "network-only",
          }),
        ])

        if (!isMounted) return

        setCurrentUserId(meData?.me?.id || null)
        setWorkspaceId(meData?.me?.currentWorkspace?.id || null)
        setWorkspaceRole(meData?.me?.currentWorkspace?.role || null)
        setMembers(membersData?.workspace?.members || [])
      } catch (error) {
        if (!isMounted) return
        toast.error(error instanceof Error ? error.message : "Failed to bootstrap aggregate inbox")
      } finally {
        if (!isMounted) return
        setIsBootstrapping(false)
      }
    }

    void bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    if (isBootstrapping || !currentMemberId) return
    void loadConversations()
  }, [currentMemberId, isBootstrapping, loadConversations])

  React.useEffect(() => {
    if (!selectedConversationId) {
      setMessages([])
      return
    }

    void loadMessages(selectedConversationId)
  }, [selectedConversationId, loadMessages])

  const loadConversationsRef = React.useRef(loadConversations)
  const loadMessagesRef = React.useRef(loadMessages)
  const selectedConversationIdRef = React.useRef<string | null>(selectedConversationId)

  React.useEffect(() => {
    loadConversationsRef.current = loadConversations
  }, [loadConversations])

  React.useEffect(() => {
    loadMessagesRef.current = loadMessages
  }, [loadMessages])

  React.useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  React.useEffect(() => {
    if (isBootstrapping || !currentMemberId) return

    const client = createImRealtimeClient()
    if (!client) return

    const channels = adapter.getBaseChannels({
      workspaceMemberId: currentMemberId,
      workspaceId,
      isWorkspaceManager: isManager,
    })

    function handleRealtimeEvent(eventName: string, payload: unknown) {
      const event = adapter.parseRealtimeEvent(eventName, payload)
      if (!event) return

      void loadConversationsRef.current()

      const activeConversationId = selectedConversationIdRef.current
      if (!activeConversationId) return
      if (event.scopeId === activeConversationId || event.scopeType !== "member") {
        void loadMessagesRef.current(activeConversationId)
      }
    }

    const subscriptions = channels.map((channelName) => {
      const channel = client.subscribe(channelName)
      channel.bind_global(handleRealtimeEvent)
      return channel
    })

    return () => {
      subscriptions.forEach((channel) => {
        channel.unbind_global(handleRealtimeEvent)
        client.unsubscribe(channel.name)
      })
      client.disconnect()
    }
  }, [adapter, currentMemberId, isBootstrapping, isManager, workspaceId])

  React.useEffect(() => {
    if (isBootstrapping || !selectedConversationId) return

    const client = createImRealtimeClient()
    if (!client) return

    const channelName = adapter.getThreadChannelName(selectedConversationId)
    const channel = client.subscribe(channelName)

    function handleRealtimeEvent(eventName: string, payload: unknown) {
      const event = adapter.parseRealtimeEvent(eventName, payload)
      if (!event) return
      if (event.scopeId !== selectedConversationId) return
      void loadConversationsRef.current()
      void loadMessagesRef.current(selectedConversationId)
    }

    channel.bind_global(handleRealtimeEvent)

    return () => {
      channel.unbind_global(handleRealtimeEvent)
      client.unsubscribe(channel.name)
      client.disconnect()
    }
  }, [adapter, isBootstrapping, selectedConversationId])

  const mineConversations = React.useMemo(
    () =>
      conversations.filter((conversation) =>
        isConversationAssignedToCurrentMember(conversation, currentMemberId),
      ),
    [conversations, currentMemberId],
  )

  const otherConversations = React.useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          !isConversationAssignedToCurrentMember(conversation, currentMemberId),
      ),
    [conversations, currentMemberId],
  )

  async function handleSendMessage(): Promise<void> {
    const conversationId = selectedConversation?.conversationId
    const text = draftMessage.trim()

    if (!conversationId) {
      toast.error("Please select a conversation first")
      return
    }

    if (!canSendSelectedConversation) {
      toast.error("You can only send messages to your assigned conversations")
      return
    }

    if (!text) {
      toast.error("Please enter a message")
      return
    }

    setIsSendingMessage(true)
    try {
      await adapter.sendMessage({
        conversationId,
        text,
      })
      setDraftMessage("")
      toast.success("已下发到 WhatsApp")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message")
    } finally {
      setIsSendingMessage(false)
    }
  }

  React.useEffect(() => {
    setDraftMessage("")
  }, [selectedConversationId])

  const renderConversationSection = React.useCallback(
    (title: string, items: AggregateConversationListItem[]) => {
      if (!items.length) return null

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </div>
          <div className="space-y-2">
            {items.map((conversation) => (
              <ConversationRow
                key={conversation.conversationId}
                conversation={conversation}
                isActive={conversation.conversationId === selectedConversationId}
                isOwnedByCurrentMember={isConversationAssignedToCurrentMember(
                  conversation,
                  currentMemberId,
                )}
                assignee={memberById.get(getConversationAssigneeId(conversation) || "") || null}
                onSelect={() => setSelectedConversationId(conversation.conversationId)}
              />
            ))}
          </div>
        </div>
      )
    },
    [currentMemberId, memberById, selectedConversationId],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquareMoreIcon className="h-6 w-6" />
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Aggregate Inbox</h2>
          <p className="text-muted-foreground">
            Provider-normalized inbox for assigned conversations with command-based send.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>
                Aggregated by provider in UI, provider-specific at the API layer.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void loadConversations()
                  if (selectedConversationId) void loadMessages(selectedConversationId)
                }}
                disabled={isLoadingConversations || isLoadingMessages}
              >
                <RefreshCcwIcon className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
            <div className="rounded-lg border px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">Provider</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={AGGREGATE_PROVIDER_THEMES.WHATSAPP.accentClassName}>
                  {AGGREGATE_PROVIDER_THEMES.WHATSAPP.badgeLabel}
                </Badge>
                <span className="text-muted-foreground">v1</span>
              </div>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, jid, preview..."
            />
            {isManager ? (
              <Tabs value={scope} onValueChange={(value) => setScope(value as AggregateScope)}>
                <TabsList>
                  <TabsTrigger value="MINE">Assigned to me</TabsTrigger>
                  <TabsTrigger value="ALL">All conversations</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {selectionNotice ? (
            <div className="mb-4 rounded-lg border border-orange-300/60 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:bg-orange-950/30 dark:text-orange-100">
              {selectionNotice}
            </div>
          ) : null}

          <div className="grid min-h-[640px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-xl border">
              <ScrollArea className="h-[640px] p-4">
                {isBootstrapping || isLoadingConversations ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : conversations.length ? (
                  <div className="space-y-6">
                    {isManager
                      ? (
                        <>
                          {renderConversationSection("Assigned to me", mineConversations)}
                          {renderConversationSection("Assigned to others", otherConversations)}
                        </>
                      )
                      : renderConversationSection("Assigned to me", conversations)}
                  </div>
                ) : (
                  <div className="flex h-[560px] items-center justify-center text-sm text-muted-foreground">
                    No conversations found.
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="rounded-xl border">
              {selectedConversation ? (
                <div className="flex h-[640px] flex-col">
                  <div className={cn(
                    "space-y-3 rounded-t-xl border-b px-5 py-4",
                    AGGREGATE_PROVIDER_THEMES[selectedConversation.provider].surfaceClassName,
                    !isConversationAssignedToCurrentMember(selectedConversation, currentMemberId) &&
                      "border-orange-300/70"
                  )}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{selectedConversation.title}</h3>
                      <Badge className={AGGREGATE_PROVIDER_THEMES[selectedConversation.provider].accentClassName}>
                        {AGGREGATE_PROVIDER_THEMES[selectedConversation.provider].badgeLabel}
                      </Badge>
                      <Badge variant={isConversationAssignedToCurrentMember(selectedConversation, currentMemberId) ? "success" : "warning"}>
                        {isConversationAssignedToCurrentMember(selectedConversation, currentMemberId)
                          ? "Assigned to me"
                          : "Assigned to others"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{selectedConversation.conversationJid}</span>
                      <span>Assignee: {getMemberLabel(memberById.get(getConversationAssigneeId(selectedConversation) || "") || null)}</span>
                      {selectedConversation.lastMessageAt ? (
                        <span>Latest: {formatDateTime(selectedConversation.lastMessageAt)}</span>
                      ) : null}
                    </div>
                  </div>

                  <ScrollArea className="h-[calc(640px-170px)] px-5 py-4">
                    {isLoadingMessages ? (
                      <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <Skeleton key={index} className="h-20 rounded-2xl" />
                        ))}
                      </div>
                    ) : messages.length ? (
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <MessageRow key={message.rowId} message={message} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[360px] items-center justify-center text-sm text-muted-foreground">
                        No messages yet.
                      </div>
                    )}
                  </ScrollArea>

                  <Separator />
                  <div className="rounded-b-xl bg-muted/40 px-5 py-4">
                    <div className="space-y-3">
                      <Textarea
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        disabled={!canSendSelectedConversation || isSendingMessage}
                        rows={3}
                        placeholder={
                          canSendSelectedConversation
                            ? "Type a message to send via WhatsApp..."
                            : "Only the assignee or a workspace manager can send here."
                        }
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                          {canSendSelectedConversation
                            ? "Messages are queued to WhatsApp and appear after provider sync."
                            : "This conversation is read-only for your current role."}
                        </p>
                        <Button
                          onClick={() => void handleSendMessage()}
                          disabled={!canSendSelectedConversation || isSendingMessage}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-[640px] items-center justify-center text-sm text-muted-foreground">
                  Select a conversation to view its timeline.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
