export interface ITgGlobalState {
  currentUserId: string;
  chats: {
    byId: {
      [id: string]: ITgChat;
    };
    totalCount: {
      all: number;
    };
    lastMessageIds: {
      all: {
        [id: string]: number;
      };
    };
  };

  messages: {
    byChatId: {
      [id: string]: {
        byId: {
          [id: number]: ITgMessage;
        };
      };
    };
  };

  settings: {
    byKey: ITgSettings;
  };
  users: {
    byId: {
      [id: string]: ITgUser;
    };
  };
}

export interface ITgChat {
  id: string;
  isMuted: boolean;
  avatarPhotoId: string;
  title: string;
  unreadCount: number;
}

export interface ITgMessage {
  chatId: string;
  content: {
    text: {
      text: string;
    };
  };
  date: number;
  editDate: number;
  id: number;
  isEdited: boolean;
  senderId?: string;
}

export interface ITgSettings {
  byKey: {
    language: "en";
    messageSendKeyCombo: "enter";
    shouldUseSystemTheme: boolean;
    theme: string;
  };
}

export interface ITgUser {
  id: string;
  avatarPhotoId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isContact: boolean;
}
