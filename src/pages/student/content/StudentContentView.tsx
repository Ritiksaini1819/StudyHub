import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, HelpCircle, CheckCircle, FileText, Download, Eye, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/Layout';
import { useSubject, useUnits, useUnitContent } from '../../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert, Button, Modal } from '../../../components/common';
import type { Question, Solution, ContentItem } from '../../../types/database';

export default function StudentContentView() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { data: subject, loading: subjectLoading, error: subjectError } = useSubject(subjectId || '');
  const { data: units, loading: unitsLoading } = useUnits(subjectId);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const { questions, solutions, contentItems, loading: contentLoading, error: contentError } = useUnitContent(selectedUnitId || '');
  const [viewPdfUrl, setViewPdfUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'solutions' | 'materials'>('questions');

  const loading = subjectLoading || unitsLoading || contentLoading;
  const selectedUnit = units?.find(u => u.id === selectedUnitId);

  if (loading && !subject) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading content..." />
        </div>
      </DashboardLayout>
    );
  }

  if (subjectError || !subject) {
    return (
      <DashboardLayout role="student">
        <div className="space-y-6">
          <Link to="/student/subjects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Subjects
            </Button>
          </Link>
          <Alert type="error" message={subjectError || 'Subject not found'} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/student/subjects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Subjects
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">{subject.name}</h1>
          {subject.description && <p className="text-gray-400 mt-1">{subject.description}</p>}
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Units Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-4">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Units
                </h3>
                {units && units.length > 0 ? (
                  <div className="space-y-1">
                    {units.map((unit, index) => (
                      <button
                        key={unit.id}
                        onClick={() => {
                          setSelectedUnitId(unit.id);
                          setActiveTab('questions');
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                          selectedUnitId === unit.id
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        <span className="truncate">{unit.name}</span>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No units available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {!selectedUnitId ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Select a unit</h3>
                  <p className="text-gray-400">Choose a unit from the left to view its content.</p>
                </CardContent>
              </Card>
            ) : contentLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" text="Loading content..." />
              </div>
            ) : (
              <>
                {/* Unit Header */}
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-white">{selectedUnit?.name}</h2>
                  {selectedUnit?.description && (
                    <p className="text-gray-400 mt-1">{selectedUnit.description}</p>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-800 pb-2 mb-4">
                  <button
                    onClick={() => setActiveTab('questions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                      activeTab === 'questions'
                        ? 'bg-gray-800 text-white border-b-2 border-emerald-500'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    Questions
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700">{questions?.length || 0}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('solutions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                      activeTab === 'solutions'
                        ? 'bg-gray-800 text-white border-b-2 border-emerald-500'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Solutions
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700">{solutions?.length || 0}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('materials')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                      activeTab === 'materials'
                        ? 'bg-gray-800 text-white border-b-2 border-emerald-500'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Materials
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700">{contentItems?.length || 0}</span>
                  </button>
                </div>

                {contentError && <Alert type="error" message={contentError} />}

                {/* Content */}
                {activeTab === 'questions' && (
                  <QuestionsView questions={questions || []} onViewPdf={setViewPdfUrl} />
                )}

                {activeTab === 'solutions' && (
                  <SolutionsView solutions={solutions || []} questions={questions || []} onViewPdf={setViewPdfUrl} />
                )}

                {activeTab === 'materials' && (
                  <ContentView items={contentItems || []} onViewPdf={setViewPdfUrl} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {viewPdfUrl && (
        <Modal isOpen={true} onClose={() => setViewPdfUrl(null)} title="PDF Viewer" size="xl">
          <div className="p-4">
            <iframe
              src={viewPdfUrl}
              className="w-full h-[600px] rounded-lg bg-gray-800"
              title="PDF Viewer"
            />
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

// Questions View
function QuestionsView({
  questions,
  onViewPdf,
}: {
  questions: Question[];
  onViewPdf: (url: string) => void;
}) {
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <HelpCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No questions available for this unit.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <Card key={question.id}>
          <CardContent className="p-5">
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
                  <div className="mt-3 flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={() => onViewPdf(question.pdf_url!)}>
                      <Eye className="w-4 h-4 mr-1.5" />
                      View PDF
                    </Button>
                    <a href={question.pdf_url} download target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4 mr-1.5" />
                        Download
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Solutions View
function SolutionsView({
  solutions,
  questions,
  onViewPdf,
}: {
  solutions: Solution[];
  questions: Question[];
  onViewPdf: (url: string) => void;
}) {
  if (solutions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No solutions available for this unit.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {solutions.map((solution) => (
        <Card key={solution.id}>
          <CardContent className="p-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h4 className="font-medium text-white">{solution.title}</h4>
              </div>
              {solution.question_id && (
                <p className="text-sm text-gray-400 ml-8 mb-2">
                  For: Question {questions.find(q => q.id === solution.question_id)?.question_number || 'Unknown'}
                </p>
              )}
              {solution.content_text && (
                <p className="text-gray-300 ml-8 whitespace-pre-wrap">{solution.content_text}</p>
              )}
              {solution.pdf_url && (
                <div className="mt-3 ml-8 flex items-center gap-3">
                  <Button variant="secondary" size="sm" onClick={() => onViewPdf(solution.pdf_url!)}>
                    <Eye className="w-4 h-4 mr-1.5" />
                    View PDF
                  </Button>
                  <a href={solution.pdf_url} download target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4 mr-1.5" />
                      Download
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Content View
function ContentView({
  items,
  onViewPdf,
}: {
  items: ContentItem[];
  onViewPdf: (url: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No study materials available for this unit.</p>
        </CardContent>
      </Card>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'study_material':
        return <span className="px-2 py-1 text-xs rounded bg-blue-500/10 text-blue-400">Study Material</span>;
      case 'note':
        return <span className="px-2 py-1 text-xs rounded bg-purple-500/10 text-purple-400">Note</span>;
      case 'resource':
        return <span className="px-2 py-1 text-xs rounded bg-orange-500/10 text-orange-400">Resource</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getTypeBadge(item.content_type)}
                <h4 className="font-medium text-white">{item.title}</h4>
              </div>
              {item.content_text && (
                <p className="text-gray-300 whitespace-pre-wrap">{item.content_text}</p>
              )}
              {item.pdf_url && (
                <div className="mt-3 flex items-center gap-3">
                  <Button variant="secondary" size="sm" onClick={() => onViewPdf(item.pdf_url!)}>
                    <Eye className="w-4 h-4 mr-1.5" />
                    View PDF
                  </Button>
                  <a href={item.pdf_url} download target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4 mr-1.5" />
                      Download
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
