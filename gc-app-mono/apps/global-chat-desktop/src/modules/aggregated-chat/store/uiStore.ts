import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SidebarSection = "pinned" | "recent";
type RightPanelTab = "crm" | "translate";

interface UIState {
  // 选中状态
  selectedConversationId: string | null;

  // 侧边栏宽度（百分比）
  sidebarWidth: number;

  // 筛选状态
  accountFilter: string[]; // [] = 全部账号

  // 侧边栏效率：分组折叠 + 置顶
  collapsedSections: Record<SidebarSection, boolean>;
  pinnedConversationIds: string[];

  // 右侧面板状态
  isRightPanelOpen: boolean;
  rightPanelActiveTab: RightPanelTab;

  // Actions
  selectConversation: (id: string | null) => void;
  setSidebarWidth: (width: number) => void;
  setAccountFilter: (accountIds: string[]) => void;
  toggleAccountFilter: (accountId: string) => void;
  clearFilters: () => void;
  setSectionCollapsed: (section: SidebarSection, collapsed: boolean) => void;
  toggleSectionCollapsed: (section: SidebarSection) => void;
  isConversationPinned: (conversationId: string) => boolean;
  toggleConversationPinned: (conversationId: string) => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setRightPanelActiveTab: (tab: RightPanelTab) => void;
}

const DEFAULT_SIDEBAR_WIDTH = 25; // 25%
const MIN_SIDEBAR_WIDTH = 15;
const MAX_SIDEBAR_WIDTH = 50;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      selectedConversationId: null,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      accountFilter: [],
      collapsedSections: {
        pinned: false,
        recent: false,
      },
      pinnedConversationIds: [],
      isRightPanelOpen: true,
      rightPanelActiveTab: "translate",

      selectConversation: (id) => {
        set({ selectedConversationId: id });
      },

      setSidebarWidth: (width) => {
        const clampedWidth = Math.min(
          Math.max(width, MIN_SIDEBAR_WIDTH),
          MAX_SIDEBAR_WIDTH,
        );
        set({ sidebarWidth: clampedWidth });
      },

      setAccountFilter: (accountIds) => {
        set({ accountFilter: accountIds });
      },

      toggleAccountFilter: (accountId) => {
        set((state) => {
          const next = new Set(state.accountFilter);
          if (next.has(accountId)) next.delete(accountId);
          else next.add(accountId);
          return { accountFilter: Array.from(next) };
        });
      },

      clearFilters: () => {
        set({ accountFilter: [] });
      },

      setSectionCollapsed: (section, collapsed) => {
        set((state) => ({
          collapsedSections: {
            ...state.collapsedSections,
            [section]: collapsed,
          },
        }));
      },

      toggleSectionCollapsed: (section) => {
        set((state) => ({
          collapsedSections: {
            ...state.collapsedSections,
            [section]: !state.collapsedSections[section],
          },
        }));
      },

      isConversationPinned: (conversationId) => {
        return get().pinnedConversationIds.includes(conversationId);
      },

      toggleConversationPinned: (conversationId) => {
        set((state) => {
          const ids = state.pinnedConversationIds;
          if (ids.includes(conversationId)) {
            return {
              pinnedConversationIds: ids.filter((id) => id !== conversationId),
            };
          }
          return { pinnedConversationIds: [conversationId, ...ids] };
        });
      },

      setRightPanelOpen: (open) => {
        set({ isRightPanelOpen: open });
      },

      toggleRightPanel: () => {
        set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen }));
      },

      setRightPanelActiveTab: (tab) => {
        set({ rightPanelActiveTab: tab });
      },
    }),
    {
      name: "srcChatUI",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        collapsedSections: state.collapsedSections,
        pinnedConversationIds: state.pinnedConversationIds,
        isRightPanelOpen: state.isRightPanelOpen,
        rightPanelActiveTab: state.rightPanelActiveTab,
      }),
    },
  ),
);
