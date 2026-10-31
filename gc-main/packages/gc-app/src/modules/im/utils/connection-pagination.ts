import {
  ConnectionPageInfo,
  ConnectionPaginationInput,
  DEFAULT_PAGE_SIZE,
} from "@/modules/im/types/whatsapp";

export function createInitialPagination(
  pageSize = DEFAULT_PAGE_SIZE,
): ConnectionPaginationInput {
  return { first: pageSize };
}

export function createNextPagination(
  pageInfo: ConnectionPageInfo,
  pageSize = DEFAULT_PAGE_SIZE,
): ConnectionPaginationInput {
  if (!pageInfo.endCursor) {
    return createInitialPagination(pageSize);
  }
  return {
    first: pageSize,
    after: pageInfo.endCursor,
  };
}

export function createPreviousPagination(
  pageInfo: ConnectionPageInfo,
  pageSize = DEFAULT_PAGE_SIZE,
): ConnectionPaginationInput {
  if (!pageInfo.startCursor) {
    return createInitialPagination(pageSize);
  }
  return {
    last: pageSize,
    before: pageInfo.startCursor,
  };
}
