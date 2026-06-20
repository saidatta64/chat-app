import { useEffect, useRef } from 'react';
import axios from 'axios';
import { Message, LinkPreview } from '../types';
import { API_URL } from '../constants';
import { extractFirstHttpUrl } from '../utils/formatting';

interface MessageLinkPreviewHydratorProps {
  message: Message;
  patchMessage: (id: string, patch: Partial<Message>) => void;
}

export function MessageLinkPreviewHydrator({
  message,
  patchMessage,
}: MessageLinkPreviewHydratorProps): null {
  const attemptKey = useRef<string | null>(null);

  useEffect(() => {
    if (message.linkPreview) return;
    const url = extractFirstHttpUrl(message.content);
    if (!url) return;
    const key = `${message._id}:${url}`;
    if (attemptKey.current === key) return;
    attemptKey.current = key;

    let cancelled = false;
    axios
      .get<{ preview: LinkPreview }>(`${API_URL}/api/chat/link-preview`, { params: { url } })
      .then((res) => {
        if (!cancelled && res.data.preview) {
          patchMessage(message._id, { linkPreview: res.data.preview });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [message._id, message.content, message.linkPreview, patchMessage]);

  return null;
}
