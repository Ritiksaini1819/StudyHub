import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, Download, Eye, ArrowLeft, BookMarked } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { useStudyMaterials, useSubject } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert, Button, Modal } from '../../components/common';
import { supabase } from '../../lib/supabase';
import type { StudyMaterial } from '../../types/database';

export function StudentMaterials() {
  const { data: materials, loading, error } = useStudyMaterials();

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading materials..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Study Materials</h1>
          <p className="text-gray-400 mt-1">Browse and access all study materials</p>
        </div>

        {error && <Alert type="error" message={error} />}

        {materials && materials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No materials yet</h3>
              <p className="text-gray-400">Materials will appear here once teachers upload them.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function MaterialCard({ material }: { material: StudyMaterial }) {
  const [showViewer, setShowViewer] = useState(false);

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('study-materials')
        .download(material.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = material.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const getFileIcon = () => {
    const fileType = material.file_type.toLowerCase();
    if (fileType === 'pdf') {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    if (fileType.includes('doc')) {
      return <FileText className="w-6 h-6 text-blue-500" />;
    }
    if (fileType.includes('ppt')) {
      return <FileText className="w-6 h-6 text-orange-500" />;
    }
    return <FileText className="w-6 h-6 text-gray-400" />;
  };

  const getFileColor = () => {
    const fileType = material.file_type.toLowerCase();
    if (fileType === 'pdf') return 'bg-red-500/10';
    if (fileType.includes('doc')) return 'bg-blue-500/10';
    if (fileType.includes('ppt')) return 'bg-orange-500/10';
    return 'bg-gray-500/10';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <>
      <Card hover onClick={() => material.file_type.toLowerCase() === 'pdf' && setShowViewer(true)}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getFileColor()}`}>
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white truncate">{material.title}</h3>
              <p className="text-sm text-gray-400 mt-1 truncate">{material.file_name}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-500">{material.file_type.toUpperCase()}</span>
                {material.file_size && (
                  <>
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs text-gray-500">{formatFileSize(material.file_size)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800">
            {material.file_type.toLowerCase() === 'pdf' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewer(true);
                }}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                View
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {showViewer && (
        <PDFViewer material={material} onClose={() => setShowViewer(false)} />
      )}
    </>
  );
}

function PDFViewer({ material, onClose }: { material: StudyMaterial; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const getUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('study-materials')
          .createSignedUrl(material.storage_path, 3600);

        if (error) throw error;
        setUrl(data.signedUrl);
      } catch (err) {
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    getUrl();
  }, [material.storage_path]);

  return (
    <Modal isOpen={true} onClose={onClose} title={material.title} size="xl">
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center h-[600px]">
            <LoadingSpinner size="lg" text="Loading PDF..." />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-[600px]">
            <Alert type="error" message={error} />
          </div>
        )}
        {url && !loading && !error && (
          <iframe
            src={url}
            className="w-full h-[600px] rounded-lg bg-gray-800"
            title={material.title}
          />
        )}
      </div>
    </Modal>
  );
}

export function StudentMaterialDetail() {
  const { materialId } = useParams();
  const { data: materials, loading: materialsLoading, error: materialsError } = useStudyMaterials();
  const material = materials?.find((m) => m.id === materialId);
  const { data: subject, loading: subjectLoading } = useSubject(material?.subject_id || '');

  const [url, setUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  React.useEffect(() => {
    if (material?.storage_path && material.file_type.toLowerCase() === 'pdf') {
      const getUrl = async () => {
        try {
          setPdfLoading(true);
          const { data, error } = await supabase.storage
            .from('study-materials')
            .createSignedUrl(material.storage_path, 3600);

          if (error) throw error;
          setUrl(data.signedUrl);
        } catch (err) {
          setPdfError('Failed to load PDF');
        } finally {
          setPdfLoading(false);
        }
      };
      getUrl();
    }
  }, [material?.storage_path, material?.file_type]);

  const loading = materialsLoading || subjectLoading;

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading material..." />
        </div>
      </DashboardLayout>
    );
  }

  if (materialsError || !material) {
    return (
      <DashboardLayout role="student">
        <div className="space-y-6">
          <Link to="/student/materials">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Materials
            </Button>
          </Link>
          <Alert type="error" message={materialsError || 'Material not found'} />
        </div>
      </DashboardLayout>
    );
  }

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('study-materials')
        .download(material.storage_path);

      if (error) throw error;

      const downloadUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = material.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/student/materials">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">{material.title}</h1>
          <p className="text-gray-400 mt-1">{material.description || material.file_name}</p>
          <div className="flex items-center gap-4 mt-3">
            {subject && (
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-gray-500" />
                <Link to={`/student/subjects/${subject.id}`} className="text-sm text-emerald-500 hover:text-emerald-400">
                  {subject.name}
                </Link>
              </div>
            )}
            <span className="text-sm text-gray-500">{material.file_type.toUpperCase()}</span>
            {material.file_size && (
              <span className="text-sm text-gray-500">{formatFileSize(material.file_size)}</span>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        {material.file_type.toLowerCase() === 'pdf' && (
          <Card>
            <CardContent className="p-4">
              {pdfLoading && (
                <div className="flex items-center justify-center h-[600px]">
                  <LoadingSpinner size="lg" text="Loading PDF..." />
                </div>
              )}
              {pdfError && (
                <div className="flex flex-col items-center justify-center h-[600px] gap-4">
                  <Alert type="error" message={pdfError} />
                  <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Instead
                  </Button>
                </div>
              )}
              {url && !pdfLoading && !pdfError && (
                <iframe
                  src={url}
                  className="w-full h-[600px] rounded-lg bg-gray-800"
                  title={material.title}
                />
              )}
            </CardContent>
          </Card>
        )}

        {material.file_type.toLowerCase() !== 'pdf' && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Preview not available</h3>
              <p className="text-gray-400 mb-4">
                This file type cannot be previewed. Download to view.
              </p>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
