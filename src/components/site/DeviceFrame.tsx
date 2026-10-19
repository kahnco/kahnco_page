// 제품 캡처를 감싸는 기기 틀. 사이트에서 그림자를 쓰는 유일한 곳.

export function BrowserFrame({ src, alt, url }: { src: string; alt: string; url?: string }) {
  return (
    <div className="frame-browser">
      <div className="bar" aria-hidden="true">
        <i />
        <i />
        <i />
        {url && <span>{url}</span>}
      </div>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

export function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="frame-phone">
      <div className="di" aria-hidden="true" />
      <div className="sc">
        <img src={src} alt={alt} loading="lazy" />
      </div>
    </div>
  );
}
