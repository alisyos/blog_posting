'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import BlogPromptSettings from './components/blog-prompt-settings';
import ImagePromptSettings from './components/image-prompt-settings';

type SettingsTab = 'blog' | 'image';

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'blog', label: '블로그 프롬프트', icon: <FileText className="h-4 w-4" /> },
  { key: 'image', label: '이미지 프롬프트', icon: <ImageIcon className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('blog');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-gray-500 mt-1">
          프롬프트 템플릿을 관리합니다.
        </p>
      </div>

      {/* 상단 탭 네비게이션 */}
      <div className="border-b mb-6">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div>
        {activeTab === 'blog' && <BlogPromptSettings />}
        {activeTab === 'image' && <ImagePromptSettings />}
      </div>
    </div>
  );
}
