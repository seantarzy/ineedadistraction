// Data Dive unified analytics

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

function gtag(...args: unknown[]): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

export function trackEvent(eventName: string, params?: EventParams): void {
  gtag('event', eventName, params);
}

// Tier 1 — Universal Events

export function trackCTAClick(params: { cta_text: string; cta_location: string; cta_destination?: string }): void {
  trackEvent('cta_click', params);
}

export function trackOutboundClick(params: { url: string; link_text?: string; link_location?: string }): void {
  trackEvent('outbound_click', params);
}

export function trackNavigationClick(params: { destination: string; nav_location: 'header' | 'footer' | 'sidebar' | 'inline' }): void {
  trackEvent('navigation_click', params);
}

export function trackContentEngagement(params: { content_type: string; content_id?: string; engagement_type: 'scroll_depth' | 'time_on_content' | 'interaction'; value?: number }): void {
  trackEvent('content_engagement', params);
}

export function trackShareClick(params: { method: string; content_type?: string; content_id?: string }): void {
  trackEvent('share_click', params);
}

export function trackError(params: { error_type: string; error_message: string; error_location?: string }): void {
  trackEvent('error_encountered', params);
}

// Tier 2 — Interactive Tool Events

export function trackToolUse(toolName: string, action: string, detail?: string): void {
  trackEvent('tool_use', { tool_name: toolName, action, detail });
}

export function trackResultGenerated(resultType: string, detail?: string): void {
  trackEvent('result_generated', { result_type: resultType, detail });
}
