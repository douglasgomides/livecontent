import { useState } from 'react';
import { 
  Video, 
  Image, 
  MessageCircle, 
  FileText,
  Copy,
  Download,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { cn } from '@/lib/utils';
import type { GeneratedContent } from '@/types/consultation';

interface ContentPreviewProps {
  content: GeneratedContent;
}

const contentTypes = [
  { id: 'reels', label: 'Reels', icon: Video, color: 'text-primary' },
  { id: 'carousels', label: 'Carrossel', icon: Image, color: 'text-info' },
  { id: 'stories', label: 'Stories', icon: MessageCircle, color: 'text-accent' },
  { id: 'posts', label: 'Posts', icon: FileText, color: 'text-success' },
];

export function ContentPreview({ content }: ContentPreviewProps) {
  const [selectedType, setSelectedType] = useState<'reels' | 'carousels' | 'stories' | 'posts'>('reels');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getContentText = (): string => {
    if (selectedType === 'reels' && content.reels[selectedIndex]) {
      return content.reels[selectedIndex].script;
    }
    if (selectedType === 'carousels' && content.carousels[selectedIndex]) {
      return content.carousels[selectedIndex].slides.join('\n\n---\n\n');
    }
    if (selectedType === 'stories' && content.stories[selectedIndex]) {
      return content.stories[selectedIndex].slides.map(s => s.content).join('\n\n');
    }
    if (selectedType === 'posts' && content.posts[selectedIndex]) {
      return content.posts[selectedIndex].content;
    }
    return '';
  };

  return (
    <DashboardSection 
      title="Conteúdos Gerados" 
      icon={Video}
      headerAction={
        <Button variant="gradient" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Baixar
        </Button>
      }
    >
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {contentTypes.map((type) => {
          const Icon = type.icon;
          const items = content[type.id as keyof GeneratedContent] || [];
          const isSelected = selectedType === type.id;
          
          return (
            <button
              key={type.id}
              onClick={() => { setSelectedType(type.id as any); setSelectedIndex(0); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {type.label} ({items.length})
            </button>
          );
        })}
      </div>

      <div className="bg-secondary/50 rounded-lg p-4 text-sm whitespace-pre-wrap text-foreground max-h-64 overflow-y-auto">
        {getContentText() || 'Nenhum conteúdo disponível'}
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        className="mt-4"
        onClick={() => handleCopy(getContentText())}
      >
        {copied ? <CheckCircle2 className="h-4 w-4 mr-1 text-success" /> : <Copy className="h-4 w-4 mr-1" />}
        {copied ? 'Copiado!' : 'Copiar'}
      </Button>
    </DashboardSection>
  );
}
