"use client";

import React, { useState } from "react";
import { useThemeSettings } from "../hooks/use-theme-settings";
import ThemeHelpers from "../theme-helpers";

interface CommentFormProps {
  postId: string;
  parentId?: string;
  onSubmit?: (comment: any) => void;
  onCancel?: () => void;
}

export default function CommentForm({
  postId,
  parentId,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const { settings } = useThemeSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    content: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!ThemeHelpers.isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.website && !ThemeHelpers.isValidUrl(formData.website)) {
      newErrors.website = "Please enter a valid URL";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Comment content is required";
    } else if (formData.content.trim().length < 10) {
      newErrors.content = "Comment must be at least 10 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          parentId,
          author: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            website: formData.website.trim() || undefined,
          },
          content: formData.content.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit comment");
      }

      const comment = await response.json();

      // Reset form
      setFormData({ name: "", email: "", website: "", content: "" });

      // Call onSubmit callback if provided
      onSubmit?.(comment);

      // Show success message (you might want to implement a toast system)
      alert(
        "Comment submitted successfully! It may need approval before appearing.",
      );
    } catch (error) {
      console.error("Error submitting comment:", error);
      alert("Failed to submit comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!settings.enable_comments) {
    return null;
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h4 className="text-lg font-semibold mb-4">
        {parentId ? "Reply to Comment" : "Leave a Comment"}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Author Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.name ? "border-red-500" : "border-border"
              }`}
              required
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.email ? "border-red-500" : "border-border"
              }`}
              required
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium mb-1">
            Website (optional)
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
              errors.website ? "border-red-500" : "border-border"
            }`}
          />
          {errors.website && (
            <p className="text-red-500 text-xs mt-1">{errors.website}</p>
          )}
        </div>

        {/* Comment Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">
            Comment *
          </label>
          <textarea
            id="content"
            name="content"
            rows={5}
            value={formData.content}
            onChange={handleInputChange}
            placeholder="Share your thoughts..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
              errors.content ? "border-red-500" : "border-border"
            }`}
            required
          />
          {errors.content && (
            <p className="text-red-500 text-xs mt-1">{errors.content}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formData.content.length}/1000 characters
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <p>
            Your email address will not be published. Required fields are marked
            *. By submitting this comment, you agree to our{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Post Comment"}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
