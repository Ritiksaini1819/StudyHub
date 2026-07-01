import { useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, HelpCircle, CheckCircle, BookOpen, Trash2, Edit2, Upload } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { useUnit, useSubject, useUnitContent } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert, Button, Modal, Input, Select } from '../../components/common';
import { supabase } from '../../lib/supabase';
import type { Question, Solution, ContentItem } from '../../types/database';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function UnitContentPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const { profile } = useAuth();
  const { data: unit, loading: unitLoading, error: unitError } = useUnit(unitId || '');
  const { data: subject } = useSubject(unit?.subject_id || '');
  const { questions, solutions, contentItems, loading: contentLoading, error: contentError, refetch } = useUnitContent(unitId || '');

  const loading = unitLoading || contentLoading;

  const [activeTab, setActiveTab] = useState<'questions' | 'solutions' | 'materials'>('questions');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: string; id: string; title: string } | null>(null);

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading content..." />
        </div>
      </SimpleLayout>
    );
  }

  if (unitError || !unit || !subject) {
    return (
      <SimpleLayout>
        <div className="space-y-6">
          <Link to="/subjects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Subjects
            </Button>
          </Link>
          <Alert type="error" message={unitError || 'Unit not found'} />
        </div>
      </SimpleLayout>
    );
  }

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      let table = '';
      if (deletingItem.type === 'question') table = 'question_bank';
      else if (deletingItem.type === 'solution') table = 'solutions';
      else if (deletingItem.type === 'content') table = 'content_items';

      const { error } = await supabase.from(table).delete().eq('id', deletingItem.id);
      if (error) throw error;

      refetch();
      setDeletingItem(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const tabs = [
    { id: 'questions', label: 'Questions', icon: HelpCircle, count: questions?.length || 0 },
    { id: 'solutions', label: 'Solutions', icon: CheckCircle, count: solutions?.length || 0 },
    { id: 'materials', label: 'Study Materials', icon: BookOpen, count: contentItems?.length || 0 },
  ];

  return (
    <SimpleLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/subjects/${subject.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Subject
              </Button>
            </Link>
          </div>
          <Button onClick={() => {
            if (activeTab === 'questions') setShowQuestionModal(true);
            else if (activeTab === 'solutions') setShowSolutionModal(true);
            else setShowContentModal(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'questions' ? 'Question' : activeTab === 'solutions' ? 'Solution' : 'Material'}
          </Button>
        </div>

        {/* Unit Info */}
        <div>
          <p className="text-sm text-gray-400">{subject.name}</p>
          <h1 className="text-2xl font-bold text-white">{unit.name}</h1>
          {unit.description && <p className="text-gray-400 mt-1">{unit.description}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white border-b-2 border-emerald-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700">{tab.count}</span>
            </button>
          ))}
        </div>

        {(contentError || unitError) && <Alert type="error" message={contentError || unitError || ''} />}

        {/* Content */}
        {activeTab === 'questions' && (
          <QuestionsList
            questions={questions || []}
            onEdit={(q) => setEditingQuestion(q)}
            onDelete={(q) => setDeletingItem({ type: 'question', id: q.id, title: `Question ${q.question_number}` })}
          />
        )}

        {activeTab === 'solutions' && (
          <SolutionsList
            solutions={solutions || []}
            questions={questions || []}
            onEdit={(s) => setEditingSolution(s)}
            onDelete={(s) => setDeletingItem({ type: 'solution', id: s.id, title: s.title })}
          />
        )}

        {activeTab === 'materials' && (
          <ContentList
            items={contentItems || []}
            onEdit={(c) => setEditingContent(c)}
            onDelete={(c) => setDeletingItem({ type: 'content', id: c.id, title: c.title })}
          />
        )}
      </div>

      {/* Modals */}
      {(showQuestionModal || editingQuestion) && (
        <QuestionModal
          unitId={unitId!}
          question={editingQuestion}
          questionNumber={(questions?.length || 0) + 1}
          onClose={() => { setShowQuestionModal(false); setEditingQuestion(null); }}
          onSuccess={() => { setShowQuestionModal(false); setEditingQuestion(null); refetch(); }}
        />
      )}

      {(showSolutionModal || editingSolution) && (
        <SolutionModal
          unitId={unitId!}
          questions={questions || []}
          solution={editingSolution}
          onClose={() => { setShowSolutionModal(false); setEditingSolution(null); }}
          onSuccess={() => { setShowSolutionModal(false); setEditingSolution(null); refetch(); }}
        />
      )}

      {(showContentModal || editingContent) && (
        <ContentModal
          unitId={unitId!}
          profileId={profile?.id || ''}
          content={editingContent}
          onClose={() => { setShowContentModal(false); setEditingContent(null); }}
          onSuccess={() => { setShowContentModal(false); setEditingContent(null); refetch(); }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <Modal isOpen={true} onClose={() => setDeletingItem(null)} title="Confirm Delete">
          <div className="p-6">
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete "{deletingItem.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeletingItem(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </Modal>
      )}
    </SimpleLayout>
  );
}

// Questions List Component
function QuestionsList({
  questions,
  onEdit,
  onDelete,
}: {
  questions: Question[];
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
}) {
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No questions yet</h3>
          <p className="text-gray-400">Add questions to this unit's question bank.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((question) => (
        <Card key={question.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                {question.question_number}
              </div>
              <div className="flex-1">
                <p className="text-white whitespace-pre-wrap">{question.question_text}</p>
                {question.image_url && (
                  <img src={question.image_url} alt="Question" className="mt-3 max-w-full rounded-lg" />
                )}
                {question.pdf_url && (
                  <a href={question.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 text-emerald-500 hover:text-emerald-400">
                    <FileText className="w-4 h-4" />
                    {question.pdf_file_name || 'View PDF'}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(question)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(question)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Solutions List Component
function SolutionsList({
  solutions,
  questions,
  onEdit,
  onDelete,
}: {
  solutions: Solution[];
  questions: Question[];
  onEdit: (s: Solution) => void;
  onDelete: (s: Solution) => void;
}) {
  if (solutions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No solutions yet</h3>
          <p className="text-gray-400">Add solutions for questions or unit-level solutions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {solutions.map((solution) => (
        <Card key={solution.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-white">{solution.title}</h4>
                {solution.question_id && (
                  <p className="text-sm text-gray-400 mt-1">
                    For: Question {questions.find(q => q.id === solution.question_id)?.question_number || 'Unknown'}
                  </p>
                )}
                {solution.content_text && (
                  <p className="text-gray-300 mt-2 whitespace-pre-wrap">{solution.content_text}</p>
                )}
                {solution.pdf_url && (
                  <a href={solution.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 text-emerald-500 hover:text-emerald-400">
                    <FileText className="w-4 h-4" />
                    {solution.pdf_file_name || 'View PDF'}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(solution)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(solution)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Content List Component
function ContentList({
  items,
  onEdit,
  onDelete,
}: {
  items: ContentItem[];
  onEdit: (c: ContentItem) => void;
  onDelete: (c: ContentItem) => void;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No study materials yet</h3>
          <p className="text-gray-400">Add study materials, notes, or resources.</p>
        </CardContent>
      </Card>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'study_material': return 'bg-blue-500/10 text-blue-500';
      case 'note': return 'bg-purple-500/10 text-purple-500';
      case 'resource': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.content_type)}`}>
                  {item.content_type.replace('_', ' ')}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">{item.title}</h4>
                  {item.content_text && (
                    <p className="text-gray-300 mt-2 whitespace-pre-wrap line-clamp-3">{item.content_text}</p>
                  )}
                  {item.pdf_url && (
                    <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 text-emerald-500 hover:text-emerald-400">
                      <FileText className="w-4 h-4" />
                      {item.pdf_file_name || 'View PDF'}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(item)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Question Modal
function QuestionModal({
  unitId,
  question,
  questionNumber,
  onClose,
  onSuccess,
}: {
  unitId: string;
  question: Question | null;
  questionNumber: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questionText, setQuestionText] = useState(question?.question_text || '');
  const [number, setNumber] = useState(question?.question_number || questionNumber);
  const [imageUrl, setImageUrl] = useState(question?.image_url || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 20MB limit');
      return;
    }

    setPdfFile(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      let pdfUrl = question?.pdf_url || null;
      let pdfFileName = question?.pdf_file_name || null;

      if (pdfFile) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `questions/${unitId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('study-materials')
          .upload(filePath, pdfFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('study-materials')
          .getPublicUrl(uploadData.path);

        pdfUrl = urlData.publicUrl;
        pdfFileName = pdfFile.name;
      }

      if (question) {
        const { error } = await supabase
          .from('question_bank')
          .update({
            question_text: questionText,
            question_number: number,
            image_url: imageUrl || null,
            pdf_url: pdfUrl,
            pdf_file_name: pdfFileName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('question_bank').insert({
          unit_id: unitId,
          question_text: questionText,
          question_number: number,
          image_url: imageUrl || null,
          pdf_url: pdfUrl,
          pdf_file_name: pdfFileName,
        });
        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={question ? 'Edit Question' : 'Add Question'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Question Number"
          type="number"
          value={number.toString()}
          onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Question Text</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter the question..."
            rows={4}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
            required
          />
        </div>

        <Input
          label="Image URL (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.png"
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">PDF Attachment (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-gray-600 transition-colors"
          >
            {pdfFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-white">{pdfFile.name}</span>
              </div>
            ) : question?.pdf_url ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-gray-400">Current: {question.pdf_file_name || 'PDF'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Upload className="w-5 h-5" />
                <span>Click to upload PDF</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{question ? 'Update' : 'Add'} Question</Button>
        </div>
      </form>
    </Modal>
  );
}

// Solution Modal
function SolutionModal({
  unitId,
  questions,
  solution,
  onClose,
  onSuccess,
}: {
  unitId: string;
  questions: Question[];
  solution: Solution | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(solution?.title || '');
  const [questionId, setQuestionId] = useState(solution?.question_id || '');
  const [contentText, setContentText] = useState(solution?.content_text || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 20MB limit');
      return;
    }

    setPdfFile(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      let pdfUrl = solution?.pdf_url || null;
      let pdfFileName = solution?.pdf_file_name || null;

      if (pdfFile) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `solutions/${unitId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('study-materials')
          .upload(filePath, pdfFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('study-materials')
          .getPublicUrl(uploadData.path);

        pdfUrl = urlData.publicUrl;
        pdfFileName = pdfFile.name;
      }

      if (solution) {
        const { error } = await supabase
          .from('solutions')
          .update({
            title,
            question_id: questionId || null,
            content_text: contentText || null,
            pdf_url: pdfUrl,
            pdf_file_name: pdfFileName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', solution.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('solutions').insert({
          unit_id: unitId,
          title,
          question_id: questionId || null,
          content_text: contentText || null,
          pdf_url: pdfUrl,
          pdf_file_name: pdfFileName,
        });
        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={solution ? 'Edit Solution' : 'Add Solution'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Solution to Question 1"
          required
        />

        <Select
          label="For Question (optional)"
          value={questionId}
          onChange={(e) => setQuestionId(e.target.value)}
          options={[
            { value: '', label: 'Unit-level solution' },
            ...questions.map(q => ({ value: q.id, label: `Question ${q.question_number}` })),
          ]}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Solution Text</label>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Enter solution text..."
            rows={4}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">PDF Attachment (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-gray-600 transition-colors"
          >
            {pdfFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-white">{pdfFile.name}</span>
              </div>
            ) : solution?.pdf_url ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-gray-400">Current: {solution.pdf_file_name || 'PDF'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Upload className="w-5 h-5" />
                <span>Click to upload PDF</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{solution ? 'Update' : 'Add'} Solution</Button>
        </div>
      </form>
    </Modal>
  );
}

// Content Modal
function ContentModal({
  unitId,
  profileId,
  content,
  onClose,
  onSuccess,
}: {
  unitId: string;
  profileId: string;
  content: ContentItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(content?.title || '');
  const [contentType, setContentType] = useState<ContentItem['content_type']>(content?.content_type || 'study_material');
  const [contentText, setContentText] = useState(content?.content_text || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 20MB limit');
      return;
    }

    setPdfFile(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      let pdfUrl = content?.pdf_url || null;
      let pdfFileName = content?.pdf_file_name || null;

      if (pdfFile) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `content/${unitId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('study-materials')
          .upload(filePath, pdfFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('study-materials')
          .getPublicUrl(uploadData.path);

        pdfUrl = urlData.publicUrl;
        pdfFileName = pdfFile.name;
      }

      if (content) {
        const { error } = await supabase
          .from('content_items')
          .update({
            title,
            content_type: contentType,
            content_text: contentText || null,
            pdf_url: pdfUrl,
            pdf_file_name: pdfFileName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', content.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('content_items').insert({
          unit_id: unitId,
          title,
          content_type: contentType,
          content_text: contentText || null,
          pdf_url: pdfUrl,
          pdf_file_name: pdfFileName,
          created_by: profileId,
        });
        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const contentTypeOptions = [
    { value: 'study_material', label: 'Study Material' },
    { value: 'note', label: 'Note' },
    { value: 'resource', label: 'Resource' },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title={content ? 'Edit Content' : 'Add Content'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Chapter Notes"
          required
        />

        <Select
          label="Type"
          value={contentType}
          onChange={(e) => setContentType(e.target.value as any)}
          options={contentTypeOptions}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Content Text</label>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Enter your notes or content..."
            rows={6}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">PDF Attachment (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-gray-600 transition-colors"
          >
            {pdfFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-white">{pdfFile.name}</span>
              </div>
            ) : content?.pdf_url ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-gray-400">Current: {content.pdf_file_name || 'PDF'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Upload className="w-5 h-5" />
                <span>Click to upload PDF</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{content ? 'Update' : 'Add'} Content</Button>
        </div>
      </form>
    </Modal>
  );
}
