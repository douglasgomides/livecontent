import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, ArrowLeft, FileAudio, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { upsertSession } from '@/lib/storage';
import { createBlankSession, uploadAudioForSession, runPipeline } from '@/lib/pipeline';
import { MAX_AUDIO_UPLOAD_MB } from '@/hooks/useAudioRecorder';
import { toast } from 'sonner';

const ACCEPTED = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/wave', 'audio/webm', 'audio/ogg'];
const MAX_MB = MAX_AUDIO_UPLOAD_MB;

export default function UploadAudio() {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = (f: File) => {
    if (!ACCEPTED.includes(f.type) && !/\.(mp3|m4a|wav|webm|ogg)$/i.test(f.name)) {
      toast.error('Formato não suportado. Use MP3, M4A, WAV ou WebM.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    const audio = new Audio(URL.createObjectURL(f));
    audio.onloadedmetadata = () => setDuration(Math.round(audio.duration || 0));
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    const ext = (file.name.split('.').pop() || 'webm').toLowerCase();
    const session = createBlankSession('upload', duration);
    session.title = title || session.title;
    try {
      const path = await uploadAudioForSession(session.id, file, ext);
      session.audioUrl = path;
      session.status = 'transcribing';
      upsertSession(session);
      runPipeline(session.id).catch(err => {
        console.error('[pipeline]', err);
        toast.error('Falha ao iniciar pipeline. Você pode tentar novamente na sessão.');
      });
      nav(`/app/session/${session.id}`);
    } catch (err: any) {
      toast.error(`Falha no upload: ${err?.message ?? err}`);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Upload de áudio</p>
        <h1 className="font-serif text-4xl mb-2">Envie uma consulta já gravada</h1>
        <p className="text-muted-foreground">Aceita MP3, M4A, WAV ou WebM. O áudio fica em armazenamento privado.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
          dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-primary/5'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {file ? (
          <div className="space-y-3">
            <FileAudio className="h-10 w-10 text-primary mx-auto" />
            <div className="font-medium">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(1)} MB{duration ? ` · ${Math.floor(duration/60)}min ${(duration%60).toString().padStart(2,'0')}s` : ''}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setFile(null); setDuration(0); }}
            >
              <X className="h-3 w-3 mr-1" /> Trocar arquivo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="font-medium">Arraste um áudio aqui ou clique para escolher</div>
            <div className="text-xs text-muted-foreground">Até {MAX_MB}MB</div>
          </div>
        )}
      </div>

      {file && (
        <div className="space-y-2">
          <Label>Título da consulta</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Retorno joelho — Ago 2026" />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav('/app')} disabled={uploading}>Cancelar</Button>
        <Button disabled={!file || uploading} onClick={submit} className="bg-gold-gradient text-primary-foreground">
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : 'Processar áudio'}
        </Button>
      </div>
    </div>
  );
}
