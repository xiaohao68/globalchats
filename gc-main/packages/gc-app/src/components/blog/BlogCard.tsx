"use client";

import Link from "next/link";
import { ArrowRight, Calendar, User, Tag, Clock } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { GlassCard, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface BlogPost {
  slug: string;
  titleKey: string;
  excerptKey: string;
  dateKey: string;
  authorKey: string;
  categoryKey: string;
  readTime: number;
  featured?: boolean;
}

export interface BlogCardProps {
  post: BlogPost;
  className?: string;
}

export function BlogCard({ post, className }: BlogCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/blog/${post.slug}`} className={cn("block group cursor-pointer", className)}>
      <GlassCard className="h-full p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        {/* 分类标签 */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs">
            <Tag className="w-3 h-3 mr-1" />
            {t(post.categoryKey)}
          </Badge>
          {post.featured && (
            <Badge variant="gradient" className="text-xs">
              Featured
            </Badge>
          )}
        </div>

        {/* 标题 */}
        <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
          {t(post.titleKey)}
        </h3>

        {/* 摘要 */}
        <p className="text-gray-600 mb-4 line-clamp-3">{t(post.excerptKey)}</p>

        {/* 元信息 */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {t(post.dateKey)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {post.readTime} {t("blog.list.minRead")}
          </span>
        </div>

        {/* 作者和阅读更多 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            {t(post.authorKey)}
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:gap-2 transition-all">
            {t("blog.list.readMore")}
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
