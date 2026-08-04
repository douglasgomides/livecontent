import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, ArrowLeft, FileAudio, X, Loader2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertSession } from '@/lib/storage';
import { createBlankSession, uploadAudioForSession, runPipeline } from '@/lib/pipeline';
import { MAX_AUDIO_UPLOAD_MB } from '@/hooks/useAudioRecorder';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@/lib/friendlyError';

const ACCEPTED = [
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/wave', 'audio/webm', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/quicktime',
];
const MAX_MB = MAX_AUDIO_UPLOAD_MB;

export default function UploadAudio() {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Duas formas de entrar: mandar o arquivo (áudio ou vídeo — a IA extrai só o
  // áudio) ou, se já tiver a transcrição em mãos (ex.: exportada de outro app),
  // colar direto e pular a etapa de upload/transcrição por Whisper.
  const [entryMode, setEntryMode] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [pasting, setPasting] = useState(false);

  const handleFile = (f: File) => {
    if (!ACCEPTED.includes(f.type) && !/\.(mp3|m4a|wav|webm|ogg|mp4|mov)$/i.test(f.name)) {
      toast.error('Formato não suportado. Use MP3, M4A, WAV, WebM, MP4 ou MOV.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    const media = f.type.startsWith('video/') ? document.createElement('video') : new Audio();
    media.src = URL.createObjectURL(f);
    media.onloadedmetadata = () => setDuration(Math.round(media.duration || 0));
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
        // err.message já vem seguro daqui — ver nota em describeFunctionError.
        toast.error(err?.message || 'Não foi possível iniciar o pipeline agora.');
      });
      nav(`/app/session/${session.id}`);
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível enviar o áudio agora. Tente de novo em instantes.'));
      setUploading(false);
    }
  };

  const submitPasted = async () => {
    if (!pastedText.trim()) return;
    setPasting(true);
    const session = createBlankSession('upload');
    session.title = title.trim() || session.title;
    session.rawTranscript = pastedText.trim();
    try {
      upsertSession(session);
      // Pula upload de áudio e transcrição por Whisper — o pipeline detecta que
      // já existe rawTranscript e vai direto pra anonimização/revisão.
      runPipeline(session.id).catch(err => {
        console.error('[pipeline]', err);
        // err.message já vem seguro daqui — ver nota em describeFunctionError.
        toast.error(err?.message || 'Não foi possível iniciar o pipeline agora.');
      });
      nav(`/app/session/${session.id}`);
    } catch (err: any) {
      toast.error(toFriendlyMessage(err, 'Não foi possível processar o texto agora.'));
      setPasting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 md:pb-0">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">Upload</p>
        <h1 className="font-serif text-4xl mb-2">Envie uma consulta já gravada</h1>
        <p className="text-muted-foreground">Mande o arquivo de áudio/vídeo, ou cole a transcrição direto se já tiver em mãos.</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={entryMode === 'file' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEntryMode('file')}
          className={entryMode === 'file' ? 'bg-gold-gradient text-primary-foreground' : ''}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload de áudio/vídeo
        </Button>
        <Button
          type="button"
          variant={entryMode === 'paste' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEntryMode('paste')}
          className={entryMode === 'paste' ? 'bg-gold-gradient text-primary-foreground' : ''}
        >
          <PenLine className="h-3.5 w-3.5 mr-1.5" /> Colar transcrição
        </Button>
      </div>

      {entryMode === 'file' ? (
        <>
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
              accept="audio/*,video/*,.mp3,.m4a,.wav,.webm,.ogg,.mp4,.mov"
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
                <div className="font-medium">Arraste um áudio ou vídeo aqui ou clique para escolher</div>
                <div className="text-xs text-muted-foreground">MP3, M4A, WAV, WebM, MP4 ou MOV — até {MAX_MB}MB</div>
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
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : 'Processar arquivo'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Título da consulta</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Retorno joelho — Ago 2026" />
          </div>
          <div className="space-y-2">
            <Label>Transcrição da consulta</Label>
            <Textarea
              rows={14}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Cole aqui a transcrição já feita da consulta (ex.: exportada de outro app de gravação)…"
            />
            <div className="text-xs text-muted-foreground text-right">{pastedText.length} caracteres</div>
            <p className="text-[11px] text-muted-foreground">
              Passa pelo mesmo processo de anonimização e revisão de dados do paciente antes de gerar qualquer conteúdo.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => nav('/app')} disabled={pasting}>Cancelar</Button>
            <Button disabled={!pastedText.trim() || pasting} onClick={submitPasted} className="bg-gold-gradient text-primary-foreground">
              {pasting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</> : 'Processar transcrição'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
