export type ImagePromptCategory = 'style' | 'mood' | 'purpose' | 'text' | 'template';

export interface ImagePrompt {
  id: string;
  category: ImagePromptCategory;
  key: string;
  name: string;
  prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImagePromptUpdateInput {
  name?: string;
  prompt?: string;
  is_active?: boolean;
}

export interface PurposePromptData {
  role: string;
  focusDescription: string;
}
