export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'student' | 'teacher';

export type ContentType = 'study_material' | 'note' | 'resource';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  grade: string | null;
  avatar_url: string | null;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface StudyMaterial {
  id: string;
  subject_id: string;
  unit_id: string | null;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  unit_id: string;
  question_number: number;
  question_text: string;
  image_url: string | null;
  pdf_url: string | null;
  pdf_file_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Solution {
  id: string;
  unit_id: string;
  question_id: string | null;
  title: string;
  content_text: string | null;
  pdf_url: string | null;
  pdf_file_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  unit_id: string;
  content_type: ContentType;
  title: string;
  content_text: string | null;
  pdf_url: string | null;
  pdf_file_name: string | null;
  order_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subject, 'id' | 'created_by'>>;
      };
      units: {
        Row: Unit;
        Insert: Omit<Unit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Unit, 'id' | 'subject_id'>>;
      };
      study_materials: {
        Row: StudyMaterial;
        Insert: Omit<StudyMaterial, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<StudyMaterial, 'id' | 'uploaded_by'>>;
      };
      question_bank: {
        Row: Question;
        Insert: Omit<Question, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Question, 'id' | 'unit_id'>>;
      };
      solutions: {
        Row: Solution;
        Insert: Omit<Solution, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Solution, 'id' | 'unit_id'>>;
      };
      content_items: {
        Row: ContentItem;
        Insert: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ContentItem, 'id' | 'unit_id' | 'created_by'>>;
      };
    };
  };
}
