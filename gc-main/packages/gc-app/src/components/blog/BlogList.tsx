"use client";

import Link from "next/link";
import { ArrowRight, Calendar, User, Tag, Clock, Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Container, GlassCard, Badge } from "@/components/ui";
import { BlogCard, BlogPost } from "./BlogCard";

// 博客文章数据
const blogPosts: BlogPost[] = [
  {
    slug: "useworke-coming-soon",
    titleKey: "blog.posts.useworke-coming-soon.title",
    excerptKey: "blog.posts.useworke-coming-soon.excerpt",
    dateKey: "blog.posts.useworke-coming-soon.date",
    authorKey: "blog.posts.useworke-coming-soon.author",
    categoryKey: "blog.posts.useworke-coming-soon.category",
    readTime: 3,
    featured: true,
  },
];

export { blogPosts };

// Featured 大卡片组件
function FeaturedCard({ post }: { post: BlogPost }) {
  const { t } = useTranslation();

  return (
    <Link href={`/blog/${post.slug}`} className="block group cursor-pointer">
      <GlassCard className="p-8 md:p-10 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* 左侧：文章信息 */}
          <div>
            {/* 分类标签 */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="gradient" className="text-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                Featured
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Tag className="w-3 h-3 mr-1" />
                {t(post.categoryKey)}
              </Badge>
            </div>

            {/* 标题 */}
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 group-hover:text-primary-600 transition-colors">
              {t(post.titleKey)}
            </h2>

            {/* 摘要 */}
            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
              {t(post.excerptKey)}
            </p>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {t(post.authorKey)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {t(post.dateKey)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime} {t("blog.list.minRead")}
              </span>
            </div>

            {/* 阅读更多 */}
            <span className="inline-flex items-center gap-2 text-primary-600 font-medium group-hover:gap-3 transition-all">
              {t("blog.list.readMore")}
              <ArrowRight className="w-5 h-5" />
            </span>
          </div>

          {/* 右侧：装饰图形 */}
          <div className="hidden md:flex items-center justify-center">
            <div className="relative">
              <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-purple/20 flex items-center justify-center">
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center shadow-lg">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
              </div>
              {/* 装饰圆点 */}
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-cyan animate-pulse" />
              <div className="absolute -bottom-3 -left-3 w-4 h-4 rounded-full bg-primary-400 animate-pulse [animation-delay:500ms]" />
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}

export function BlogList() {
  const { t } = useTranslation();
  const featuredPosts = blogPosts.filter((post) => post.featured);
  const regularPosts = blogPosts.filter((post) => !post.featured);

  return (
    <section className="py-16">
      <Container>
        {/* Featured 文章 - 大卡片展示 */}
        {featuredPosts.length > 0 && (
          <div className="mb-12">
            {featuredPosts.map((post) => (
              <FeaturedCard key={post.slug} post={post} />
            ))}
          </div>
        )}

        {/* 普通文章列表 */}
        {regularPosts.length > 0 && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {regularPosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}

        {/* 即将推出提示 */}
        <div className="mt-16">
          <GlassCard className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-accent-purple/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="text-gray-900 font-medium mb-1">
                  {t("blog.list.comingSoonTitle") || "更多精彩内容即将发布"}
                </p>
                <p className="text-gray-500 text-sm">
                  {t("blog.list.comingSoonSubtitle") || "敬请期待我们的最新动态与技术分享"}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </Container>
    </section>
  );
}
