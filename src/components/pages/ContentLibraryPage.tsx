import { 
  Video, 
  Image, 
  MessageCircle, 
  FileText,
  Download,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Consultation } from '@/types/consultation';
import { useState } from 'react';

interface ContentLibraryPageProps {
  consultations: Consultation[];
}

type ContentType = 'all' | 'reel' | 'carousel' | 'stories' | 'post';

interface ContentItem {
  id: string;
  consultationId: string;
  consultationDate: Date;
  type: 'reel' | 'carousel' | 'stories' | 'post';
  title: string;
  preview: string;
}

export function ContentLibraryPage({ consultations }: ContentLibraryPageProps) {
  const [filter, setFilter] = useState<ContentType>('all');

  // Collect all content from consultations
  const allContent: ContentItem[] = consultations.flatMap(c => {
    if (!c.generatedContent) return [];
    
    const items: ContentItem[] = [];
    
    c.generatedContent.reels?.forEach(r => {
      items.push({
        id: r.id,
        consultationId: c.id,
        consultationDate: c.createdAt,
        type: 'reel',
        title: r.title,
        preview: r.script.substring(0, 100) + '...',
      });
    });

    c.generatedContent.carousels?.forEach(r => {
      items.push({
        id: r.id,
        consultationId: c.id,
        consultationDate: c.createdAt,
        type: 'carousel',
        title: r.title,
        preview: r.slides[0] || '',
      });
    });

    c.generatedContent.posts?.forEach(r => {
      items.push({
        id: r.id,
        consultationId: c.id,
        consultationDate: c.createdAt,
        type: 'post',
        title: r.title,
        preview: r.content.substring(0, 100) + '...',
      });
    });

    return items;
  });

  const filteredContent = filter === 'all' 
    ? allContent 
    : allContent.filter(c => c.type === filter);

  const contentTypeConfig = {
    reel: { icon: Video, label: 'Reel', color: 'text-primary', bg: 'bg-primary/10' },
    carousel: { icon: Image, label: 'Carrossel', color: 'text-info', bg: 'bg-info/10' },
    stories: { icon: MessageCircle, label: 'Stories', color: 'text-accent', bg: 'bg-accent/10' },
    post: { icon: FileText, label: 'Post', color: 'text-success', bg: 'bg-success/10' },
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(contentTypeConfig).map(([type, config]) => {
          const Icon = config.icon;
          const count = allContent.filter(c => c.type === type).length;
          return (
            <Card key={type} glass className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", config.bg)}>
                  <Icon className={cn("h-5 w-5", config.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-sm text-muted-foreground">{config.label}s</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos ({allContent.length})
        </Button>
        {Object.entries(contentTypeConfig).map(([type, config]) => {
          const Icon = config.icon;
          const count = allContent.filter(c => c.type === type).length;
          return (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type as ContentType)}
            >
              <Icon className="h-4 w-4 mr-1" />
              {config.label}s ({count})
            </Button>
          );
        })}
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <Card glass className="p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum conteúdo encontrado</h3>
          <p className="text-muted-foreground">
            Grave consultas e gere conteúdos para vê-los aqui
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContent.map((item) => {
            const config = contentTypeConfig[item.type];
            const Icon = config.icon;
            
            return (
              <Card key={item.id} glass className="hover:border-primary/30 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.consultationDate)}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-foreground mb-2 line-clamp-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{item.preview}</p>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Ver
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
