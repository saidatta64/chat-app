import React from 'react';
import { LinkPreview } from '../types';
import { hostnameOnly } from '../utils/formatting';

interface LinkPreviewCardProps {
  lp: LinkPreview;
}

export function LinkPreviewCard({ lp }: LinkPreviewCardProps): React.JSX.Element | null {
  const open = () => window.open(lp.url, '_blank', 'noopener,noreferrer');
  const showImage = !!lp.imageUrl;
  const site = lp.siteName ?? hostnameOnly(lp.url);
  const hasBody = !!(lp.title || site);

  if (!showImage && !hasBody) return null;

  return (
    <button type="button" className="link-preview-card" onClick={open}>
      {showImage ? (
        <div className="link-preview-thumb">
          <img src={lp.imageUrl} alt="" referrerPolicy="no-referrer" />
          {lp.isVideo ? (
            <span className="link-preview-play" aria-hidden>
              {'\u25B6'}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="link-preview-body">
        {lp.title ? <div className="link-preview-title">{lp.title}</div> : null}
        <div className="link-preview-site">{site}</div>
      </div>
    </button>
  );
}
