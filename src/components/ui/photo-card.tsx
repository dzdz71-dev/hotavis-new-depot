"use client";

import * as React from "react";
import { Upload, X, Check, Loader2, Image as LucideImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface PhotoCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  examples?: string[];
  tips?: string[];
  count: number;
  minRecommended: number;
  max: number;
  uploading: boolean;
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
  photos: string[];
  onRemove: (index: number) => void;
  single?: boolean;
}

export function PhotoCard({
  icon,
  title,
  subtitle,
  examples = [],
  tips = [],
  count,
  minRecommended,
  max,
  uploading,
  onFile,
  onFiles,
  photos,
  onRemove,
  single = false,
}: PhotoCardProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  const isCompleted = count >= minRecommended;
  const isEmpty = count === 0;
  const isMinReached = count >= minRecommended && count < max;
  const progress = Math.min((count / minRecommended) * 100, 100);

  const getStatusLabel = () => {
    if (isCompleted && count >= max) return "✓ Complété";
    if (isCompleted) return `Minimum atteint (${count}/${minRecommended})`;
    if (isEmpty) return "À compléter";
    return `${count} / ${minRecommended} photos`;
  };

  const getStatusColor = () => {
    if (isCompleted && count >= max)
      return "bg-google-green/10 text-google-green border-google-green/20";
    if (isCompleted) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length > 0) {
        if (single && onFile) {
          onFile(files[0]);
        } else if (!single && onFiles) {
          onFiles(files.slice(0, max - count));
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (files.length > 0) {
      if (single && onFile) {
        onFile(files[0]);
      } else if (!single && onFiles) {
        onFiles(files.slice(0, max - count));
      }
    }
    // Reset the input so the same file can be selected again
    setFileInputKey((k) => k + 1);
  };

  const handleClickUpload = () => {
    // Trigger the hidden file input
    const input = document.getElementById(`photo-upload-${title.replace(/\s+/g, "-")}`);
    input?.click();
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300",
        dragActive && "ring-2 ring-google-blue/50",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-google-blue/10 flex items-center justify-center text-google-blue">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm mt-1">{subtitle}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn("flex-shrink-0 whitespace-nowrap", getStatusColor())}
          >
            {getStatusLabel()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progression recommandée</span>
            <span className="font-medium text-google-blue">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            {count} photo{count > 1 ? "s" : ""} sur {minRecommended} recommandée
            {minRecommended > 1 ? "s" : ""}
            {max > minRecommended && ` (max ${max})`}
          </p>
        </div>

        {/* Examples & Tips */}
        {(examples.length > 0 || tips.length > 0) && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            {examples.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Exemples suggérés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {examples.map((ex, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs bg-background border border-border rounded-full"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tips.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Conseils Google
                </p>
                <ul className="space-y-1">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-google-green flex-shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Upload Zone */}
        <div
          className={cn(
            "relative rounded-xl border-2 transition-all duration-200",
            dragActive
              ? "border-google-blue bg-google-blue/5"
              : photos.length > 0
                ? "border-border"
                : "border-dashed border-border hover:border-google-blue/50",
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {photos.length > 0 ? (
            // Photo grid
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden group"
                >
                  <img
                    src={photo}
                    alt={`${title} ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    aria-label={`Supprimer ${title} ${index + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add more button if not at max */}
              {photos.length < max && (
                <label
                  htmlFor={`photo-upload-${title.replace(/\s+/g, "-")}`}
                  className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-border hover:border-google-blue hover:bg-google-blue/5 cursor-pointer transition-all"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1 text-center px-2">
                    Ajouter
                  </span>
                  <input
                    id={`photo-upload-${title.replace(/\s+/g, "-")}`}
                    type="file"
                    accept="image/*"
                    multiple={!single}
                    disabled={uploading}
                    onChange={handleFileSelect}
                    className="hidden"
                    key={fileInputKey}
                  />
                </label>
              )}
            </div>
          ) : (
            // Empty state - click to upload
            <label
              htmlFor={`photo-upload-${title.replace(/\s+/g, "-")}`}
              className="flex flex-col items-center justify-center py-8 px-4 cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
              ) : (
                <>
                  <LucideImage className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium text-foreground">Cliquez pour importer</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ou glissez-déposez vos images ici
                  </p>
                  {single && <p className="text-xs text-muted-foreground mt-2">1 photo maximum</p>}
                  {!single && (
                    <p className="text-xs text-muted-foreground mt-2">Jusqu'à {max} photos</p>
                  )}
                </>
              )}
              <input
                id={`photo-upload-${title.replace(/\s+/g, "-")}`}
                type="file"
                accept="image/*"
                multiple={!single}
                disabled={uploading}
                onChange={handleFileSelect}
                className="hidden"
                key={fileInputKey}
              />
            </label>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
