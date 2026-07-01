import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Edit2, Trash2, Download, Eye, Upload, BookMarked } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { useStudyMaterials, useSubjects, useUnits } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert, Button, Modal, Input, Select } from '../../components/common';
import { supabase } from '../../lib/supabase';
import type { StudyMaterial, Subject } from '../../types/database';

const ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function TeacherMaterials() {
  const { profile } = useAuth();
  const { data: subjects, loading: subjectsLoading } = useSubjects();
  const { data: allMaterials, loading: materialsLoading, error, refetch } = useStudyMaterials();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<StudyMaterial | null>(null);

  const mySubjects = subjects?.filter((s) => s.created_by === profile?.id) || [];
  const myMaterials = allMaterials?.filter((m) => m.uploaded_by === profile?.id) || [];

  const loading = subjectsLoading || materialsLoading;

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading materials..." />
        </div>
      </DashboardLayout>
    );
  }

  const handleDelete = async (material: StudyMaterial) => {
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('study-materials')
        .remove([material.storage_path]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('study_materials')
        .delete()
        .eq('id', material.id);

      if (dbError) throw dbError;

      refetch();
      setDeletingMaterial(null);
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  };

  const enrichMaterial = (material: StudyMaterial) => ({
    ...material,
    subject_name: subjects?.find((s) => s.id === material.subject_id)?.name || 'Unknown',
  });

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Study Materials</h1>
            <p className="text-gray-400 mt-1">Upload and manage study materials</p>
          </div>
          <Button onClick={() => setShowUploadModal(true)} disabled={mySubjects.length === 0}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Material
          </Button>
        </div>

        {error && <Alert type="error" message={error} />}

        {mySubjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookMarked className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Create a subject first</h3>
              <p className="text-gray-400 mb-4">You need a subject before uploading materials.</p>
              <Link to="/teacher/subjects">
                <Button>Create Subject</Button>
              </Link>
            </CardContent>
          </Card>
        ) : myMaterials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myMaterials.map(enrichMaterial).map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onView={() => setViewingMaterial(material)}
                onDelete={() => setDeletingMaterial(material)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No materials yet</h3>
              <p className="text-gray-400 mb-4">Upload your first study material.</p>
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Material
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadMaterialModal
          subjects={mySubjects}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            refetch();
          }}
        />
      )}

      {/* View Modal */}
      {viewingMaterial && (
        <MaterialViewModal
          material={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
          onDelete={() => {
            setViewingMaterial(null);
            setDeletingMaterial(viewingMaterial);
          }}
          onUpdate={() => refetch()}
        />
      )}

      {/* Delete Confirmation */}
      {deletingMaterial && (
        <Modal isOpen={true} onClose={() => setDeletingMaterial(null)} title="Delete Material">
          <div className="p-6">
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete "{deletingMaterial.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeletingMaterial(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deletingMaterial)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function MaterialCard({
  material,
  onView,
  onDelete,
}: {
  material: StudyMaterial & { subject_name: string };
  onView: () => void;
  onDelete: () => void;
}) {
  const getFileIcon = () => {
    const type = material.file_type.toLowerCase();
    if (type === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('doc')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (type.includes('ppt')) return <FileText className="w-5 h-5 text-orange-500" />;
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  const getColor = () => {
    const type = material.file_type.toLowerCase();
    if (type === 'pdf') return 'bg-red-500/10';
    if (type.includes('doc')) return 'bg-blue-500/10';
    if (type.includes('ppt')) return 'bg-orange-500/10';
    return 'bg-gray-500/10';
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Card hover onClick={onView}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getColor()}`}>
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white truncate">{material.title}</h3>
            <p className="text-sm text-gray-400 truncate">{material.subject_name}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-500">{material.file_type.toUpperCase()}</span>
              {material.file_size && (
                <span className="text-xs text-gray-500">{formatSize(material.file_size)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-800">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(); }}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadMaterialModal({
  subjects,
  onClose,
  onSuccess,
}: {
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [unitId, setUnitId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: units } = useUnits(subjectId);
  const filteredUnits = units?.filter((u) => u.subject_id === subjectId) || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_FILE_TYPES.includes(ext)) {
      setError(`Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds 50MB limit');
      return;
    }

    setFile(selectedFile);
    setTitle(title || selectedFile.name.replace(/\.[^/.]+$/, ''));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || !profile || !subjectId) {
      setError('Please fill all required fields');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate storage path
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `${profile.id}/${subjectId}/${fileName}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-materials')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Check if it's a bucket not found error
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not configured. Please contact support.');
        }
        throw uploadError;
      }

      setUploadProgress(50);

      // Save to database
      const { error: dbError } = await supabase.from('study_materials').insert({
        subject_id: subjectId,
        unit_id: unitId || null,
        title,
        description: description || null,
        file_name: file.name,
        file_type: ext,
        file_size: file.size,
        storage_path: uploadData.path,
        uploaded_by: profile.id,
      });

      if (dbError) {
        // Roll back: delete uploaded file
        await supabase.storage.from('study-materials').remove([uploadData.path]);
        throw dbError;
      }

      setUploadProgress(100);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Upload Material">
      <div className="p-6 space-y-4">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Material title"
          required
        />

        <Select
          label="Subject"
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value);
            setUnitId('');
          }}
          options={subjects.map((s) => ({ value: s.id, label: s.name }))}
        />

        {filteredUnits.length > 0 && (
          <Select
            label="Unit (optional)"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            options={[{ value: '', label: 'No unit' }, ...filteredUnits.map((u) => ({ value: u.id, label: u.name }))]}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={2}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_FILE_TYPES.map((t) => `.${t}`).join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-gray-600 transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-emerald-500" />
                <div className="text-left">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">Click to select file</p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, PPT, PPTX, TXT (max 50MB)</p>
              </>
            )}
          </div>
        </div>

        {uploading && (
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} loading={uploading} disabled={!file || !title}>
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MaterialViewModal({
  material,
  onClose,
  onDelete,
  onUpdate,
}: {
  material: StudyMaterial;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const [title, setTitle] = useState(material.title);
  const [description, setDescription] = useState(material.description || '');
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    const loadUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('study-materials')
          .createSignedUrl(material.storage_path, 3600);

        if (error) throw error;
        setUrl(data.signedUrl);
      } catch (err) {
        setError('Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadUrl();
  }, [material.storage_path]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('study_materials')
        .update({
          title,
          description: description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', material.id);

      if (error) throw error;
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      setError('Failed to update');
    } finally {
      setSaving(false);
    }
  };

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

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={isEditing ? 'Edit Material' : material.title} size="xl">
      <div className="p-6 space-y-4">
        {error && <Alert type="error" message={error} />}

        {isEditing ? (
          <div className="space-y-4">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400">{material.description || 'No description'}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500">{material.file_type.toUpperCase()}</span>
                  {material.file_size && (
                    <span className="text-sm text-gray-500">{formatSize(material.file_size)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <LoadingSpinner size="lg" text="Loading file..." />
                </div>
              ) : material.file_type.toLowerCase() === 'pdf' && url ? (
                <iframe src={url} className="w-full h-[500px] rounded-lg bg-gray-800" title={material.title} />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Preview not available for this file type</p>
                  <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
