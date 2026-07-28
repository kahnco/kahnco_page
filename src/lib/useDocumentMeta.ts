import { useEffect } from "react";

// 라우트별 <title>/<meta description> 를 갱신한다(클라이언트 SPA용 경량 SEO).
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      let el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "description");
        document.head.appendChild(el);
      }
      el.setAttribute("content", description);
    }
  }, [title, description]);
}
