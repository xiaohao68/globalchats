import { cn } from "@gc/lib/utils.ts";
import { useNavigate } from "react-router";
import { useAppStore } from "@gc/store";
import { FC, memo } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { EPlatform, ERouterPath } from "@gc/model";
import {
  IconClose,
  IconDragControl,
  IconRefresh,
  PlatformIcon,
} from "@/components/icons";
import { defaultTransition } from "@gc/utils";
import { useOnDragSort } from "@/components/layouts/left-sidebar/useOnDragSort.ts";
import { AppProxyInfo } from "@/components/layouts/left-sidebar/AppProxyInfo.tsx";
import { ConditionalRender } from "@gc/ui/custorm-components";
import { FolderOpen } from "lucide-react";
import { IconDelete } from "@/components/icons/IconDelete.tsx";
import { useShallow } from "zustand/react/shallow";
import { webviewManger } from "@gc/webview";
import { isEmpty } from "lodash-es";
import { DeleteAppPopover } from "@/components/popover/DeleteAppPopover.tsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gc/ui/components/avatar.tsx";

export const AppList: FC = memo(({}) => {
  // const { appId } = useParams();

  const navigate = useNavigate();

  const [appList, updateAppList] = useAppStore(
    useShallow((store) => [store.getAppList(), store.persistUpdateAppList]),
  );

  const onSort = useOnDragSort(appList, updateAppList);

  return (
    <DragDropContext onDragEnd={onSort}>
      <Droppable droppableId={`AppList-droppableId`}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {appList.map((app, index) => (
              <Draggable key={app.id} draggableId={app.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className="mb-[8px] h-[44px]"
                  >
                    <div
                      className={cn(
                        "group flex h-full w-full cursor-pointer items-center",
                      )}
                    >
                      {/* drag control */}
                      <IconDragControl
                        provided={provided}
                        snapshot={snapshot}
                      />
                      {/* app item */}
                      <div
                        className={cn(
                          "flex h-full w-full rounded-xl",
                          "text-sm",
                          defaultTransition,
                          "group-hover:bg-primary/10 group-hover:text-primary",

                          app.isSelect && "bg-primary/10 text-primary",
                          snapshot.isDragging &&
                            "bg-primary/10 text-primary border-primary border",
                        )}
                        onClick={() => {
                          webviewManger.open(app.id);
                          navigate(`${ERouterPath.singleChat}/${app.id}`);
                        }}
                      >
                        <div className="flex flex-1 items-center">
                          <div
                            className={cn(
                              "invisible ml-0.5 h-[13px] w-1 rounded-[3px] bg-[#1f75ff]",
                              app.isSelect && "visible",
                            )}
                          />

                          <div className="relative pl-[25px]">
                            <div className="h-[24px] w-[24px] overflow-hidden rounded-full">
                              <Avatar className="h-full w-full rounded-lg">
                                <AvatarImage
                                  src={app.userInfo?.avatar}
                                  alt={app.userInfo?.nickname}
                                />
                                <AvatarFallback className="bg-muted-foreground text-xs">
                                  {app.userInfo?.nickname?.substring(0, 2) ||
                                    "未登"}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div
                              className={cn(
                                "absolute right-0 bottom-0 size-2 rounded-full border border-white",
                                app.isOnline ? "bg-[#34c759]" : "bg-[#b8babf]",
                              )}
                            />

                            <ConditionalRender condition={!!app.unreadCount}>
                              <div
                                className={cn(
                                  "absolute top-[-9px] right-[-9px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] leading-none text-white",
                                  !isEmpty(app.unreadCount) && "hidden",
                                )}
                              >
                                <div>
                                  {app.unreadCount > 99
                                    ? "99"
                                    : app.unreadCount}
                                </div>
                              </div>
                            </ConditionalRender>
                          </div>

                          <div className="ml-[10px] grid auto-rows-auto grid-cols-1">
                            <div className="flex w-[84px] items-center">
                              <PlatformIcon platform={app.platform} size={15} />
                              <span
                                className={
                                  "w-[69px] truncate pl-0.5 text-sm leading-tight"
                                }
                              >
                                {app.userInfo?.nickname ||
                                  (app.platform === EPlatform.Fingerprint
                                    ? "指纹浏览"
                                    : "未登录")}
                              </span>
                            </div>
                            <AppProxyInfo appId={app.id} />
                          </div>
                          <div
                            className={cn(
                              "flex gap-[6px] pl-[4px]",
                              "text-[#84868C]",
                            )}
                          >
                            <ConditionalRender
                              condition={app.isOnline}
                              fallback={
                                <>
                                  <div
                                    className={cn(
                                      "hover:text-primary p-[2px]",
                                      defaultTransition,
                                    )}
                                    onClick={() => {
                                      webviewManger.open(app.id);
                                    }}
                                  >
                                    <FolderOpen size={16} />
                                  </div>

                                  <DeleteAppPopover appId={app.id}>
                                    <div
                                      className={cn(
                                        "hover:text-primary p-[2px]",
                                        defaultTransition,
                                      )}
                                      onClick={(evt) => {
                                        evt.stopPropagation();
                                      }}
                                    >
                                      <IconDelete />
                                    </div>
                                  </DeleteAppPopover>
                                </>
                              }
                            >
                              <>
                                <div
                                  className={cn(
                                    "hover:text-primary p-[2px]",
                                    defaultTransition,
                                  )}
                                  onClick={(evt) => {
                                    evt.stopPropagation();
                                    webviewManger.reload(app.id);
                                  }}
                                >
                                  <IconRefresh />
                                </div>
                                <div
                                  className={cn(
                                    "hover:text-primary p-[2px]",
                                    defaultTransition,
                                  )}
                                  onClick={(evt) => {
                                    evt.stopPropagation();
                                    webviewManger.close(app.id);
                                  }}
                                >
                                  <IconClose />
                                </div>
                              </>
                            </ConditionalRender>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
});
