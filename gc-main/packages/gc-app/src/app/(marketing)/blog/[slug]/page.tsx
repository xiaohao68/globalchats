"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Tag, Clock } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Container, Badge, Button, GlassCard } from "@/components/ui";
import { GradientOrb, GridBackground } from "@/components/effects";
import { blogPosts } from "@/components/blog";
import { CTA } from "@/components/home";

// 文章内容区块类型
interface ContentSection {
  type: "paragraph" | "heading" | "list";
  content?: string;
  items?: string[];
}

interface ArticleContent {
  sections: ContentSection[];
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t, raw } = useTranslation();

  // 查找当前文章
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <Container className="py-32 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          文章未找到
        </h1>
        <Link href="/blog">
          <Button variant="ghost">返回博客列表</Button>
        </Link>
      </Container>
    );
  }

  // 获取文章内容
  const contentKey = `blog.posts.${slug}.content`;
  const content = raw<ArticleContent>(contentKey);

  return (
    <>
      {/* 文章头部 */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <GridBackground />
          <GradientOrb
            className="absolute top-20 right-1/4 w-96 h-96"
            colors={["#3B82F6", "#8B5CF6"]}
            blur="3xl"
            opacity={30}
          />
        </div>

        <Container>
          {/* 返回按钮 */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("blog.article.backToList")}
          </Link>

          {/* 分类标签 */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">
              <Tag className="w-3 h-3 mr-1" />
              {t(post.categoryKey)}
            </Badge>
            {post.featured && (
              <Badge variant="gradient">Featured</Badge>
            )}
          </div>

          {/* 文章标题 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t(post.titleKey)}
          </h1>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t(post.authorKey)}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t(post.dateKey)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {post.readTime} {t("blog.list.minRead")}
            </span>
          </div>
        </Container>
      </section>

      {/* 文章内容 */}
      <section className="py-16">
        <Container>
          <GlassCard className="p-8 md:p-12">
            <article className="prose prose-lg max-w-none">
              {content?.sections?.map((section, index) => {
                switch (section.type) {
                  case "heading":
                    return (
                      <h2
                        key={index}
                        className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0"
                      >
                        {section.content}
                      </h2>
                    );
                  case "paragraph":
                    return (
                      <p
                        key={index}
                        className="text-gray-600 leading-relaxed mb-4"
                      >
                        {section.content}
                      </p>
                    );
                  case "list":
                    return (
                      <ul
                        key={index}
                        className="list-disc list-inside space-y-2 text-gray-600 mb-4"
                      >
                        {section.items?.map((item, itemIndex) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                    );
                  default:
                    return null;
                }
              })}
            </article>
          </GlassCard>
        </Container>
      </section>

      <CTA />
    </>
  );
}
