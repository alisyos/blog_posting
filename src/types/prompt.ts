import type { ContentType } from './post';

export interface Prompt {
  id: string;
  name: string;
  content_type: ContentType;
  template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptInput {
  name: string;
  content_type: ContentType;
  template: string;
  is_default?: boolean;
}
