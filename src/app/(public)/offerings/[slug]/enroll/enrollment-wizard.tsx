/**
 * Enrollment Wizard — multi-step form for enrolling in any offering.
 *
 * Steps:
 *   1. Personal Details — name, phone, city, age, education, referral
 *   2. Payment — bank details shown, receipt upload
 *   3. Confirmation — success message
 *
 * Generic: works for programs, courses, and workshops.
 */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileImage,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, APP_NAME } from "@/lib/constants";
import { toast } from "sonner";
import type { OfferingType, StudentDetails } from "@/lib/types/database";

interface EnrollmentWizardProps {
  offeringId: string;
  offeringTitle: string;
  offeringType: OfferingType;
  offeringPrice: number;
  userId: string;
  userName: string;
  userPhone: string;
}

const STEPS = [
  { icon: User, label: "Your Details" },
  { icon: CreditCard, label: "Payment" },
  { icon: CheckCircle, label: "Confirmation" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const EDUCATION_OPTIONS = [
  "Matric / O-Levels",
  "Intermediate / A-Levels",
  "Bachelors",
  "Masters or above",
  "Islamic Studies (informal)",
  "Other",
];

const REFERRAL_OPTIONS = [
  "A friend or family member",
  "Social media (Instagram, Facebook, etc.)",
  "WhatsApp group",
  "Search engine (Google)",
  "Other",
];

export function EnrollmentWizard({
  offeringId,
  offeringTitle,
  offeringType,
  offeringPrice,
  userId,
  userName,
  userPhone,
}: EnrollmentWizardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Personal details
  const [details, setDetails] = useState<StudentDetails>({
    full_name: userName,
    phone: userPhone,
    city: "",
    age: "",
    education_level: "",
    referral_source: "",
    message: "",
  });

  // Step 2: Payment
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [senderName, setSenderName] = useState(userName);
  const [submitting, setSubmitting] = useState(false);

  // ─── Helpers ───────────────────────────────────────────

  function updateDetail(key: keyof StudentDetails, value: string) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1(): boolean {
    if (!details.full_name.trim()) {
      toast.error("Please enter your full name.");
      return false;
    }
    if (!details.phone.trim()) {
      toast.error("Please enter your phone number.");
      return false;
    }
    if (!details.city.trim()) {
      toast.error("Please enter your city.");
      return false;
    }
    return true;
  }

  function goNext() {
    if (currentStep === 0 && !validateStep1()) return;
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ─── File handling ─────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error("Please upload a JPG, PNG, WebP image or PDF file.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setFile(selected);

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Submit ────────────────────────────────────────────

  async function handleSubmit() {
    if (!file) {
      toast.error("Please upload your payment receipt.");
      return;
    }
    if (!senderName.trim()) {
      toast.error("Please enter the sender name on the payment.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Upload receipt
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${offeringId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Create enrollment with student details
      const { error: enrollError } = await supabase.from("enrollments").insert({
        student_id: userId,
        offering_id: offeringId,
        payment_receipt_url: filePath,
        payment_amount: offeringPrice,
        payment_method: "bank_transfer",
        student_details: details,
      });

      if (enrollError) {
        await supabase.storage.from("payment-receipts").remove([filePath]);
        throw new Error(`Enrollment failed: ${enrollError.message}`);
      }

      // 3. Update profile with phone if empty
      if (!userPhone && details.phone) {
        await supabase
          .from("profiles")
          .update({ phone: details.phone })
          .eq("id", userId);
      }

      // Move to confirmation step
      setCurrentStep(2);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step Indicator ────────────────────────────────────

  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-0 mb-10">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const StepIcon = step.icon;

          return (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive || isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-12 sm:w-20 mx-2 mb-6 ${
                    isCompleted ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── STEP 1: Personal Details ──────────────────────────

  function PersonalDetailsStep() {
    return (
      <Card className="glass">
        <CardContent className="p-6 md:p-8">
          <h2 className="font-heading font-semibold text-lg mb-1">
            Tell Us About Yourself
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            This helps us personalize your learning experience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Your full name"
                value={details.full_name}
                onChange={(e) => updateDetail("full_name", e.target.value)}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone / WhatsApp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="03XX-XXXXXXX"
                value={details.phone}
                onChange={(e) => updateDetail("phone", e.target.value)}
                required
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                placeholder="e.g. Lahore, Karachi, Islamabad"
                value={details.city}
                onChange={(e) => updateDetail("city", e.target.value)}
                required
              />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                placeholder="e.g. 22"
                value={details.age}
                onChange={(e) => updateDetail("age", e.target.value)}
              />
            </div>

            {/* Education Level */}
            <div className="space-y-2">
              <Label htmlFor="education">Education Level</Label>
              <select
                id="education"
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                value={details.education_level}
                onChange={(e) =>
                  updateDetail("education_level", e.target.value)
                }
              >
                <option value="">Select...</option>
                {EDUCATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* How did you hear about us */}
            <div className="space-y-2">
              <Label htmlFor="referral">How did you hear about us?</Label>
              <select
                id="referral"
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                value={details.referral_source}
                onChange={(e) =>
                  updateDetail("referral_source", e.target.value)
                }
              >
                <option value="">Select...</option>
                {REFERRAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="message">
                Anything you&apos;d like us to know? (optional)
              </Label>
              <Textarea
                id="message"
                placeholder="e.g. your goals, prior learning experience, scheduling preferences..."
                rows={3}
                value={details.message}
                onChange={(e) => updateDetail("message", e.target.value)}
              />
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end mt-8">
            <Button size="lg" onClick={goNext} className="press">
              Continue to Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── STEP 2: Payment & Upload ──────────────────────────

  function PaymentStep() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bank Details */}
          <Card className="glass">
            <CardContent className="p-6">
              <h2 className="font-heading font-semibold text-lg mb-4">
                Payment Details
              </h2>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-secondary/60">
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(offeringPrice)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-medium">
                      JazzCash / EasyPaisa / Bank Transfer
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Account Title
                    </p>
                    <p className="font-medium">{APP_NAME}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Account Number
                    </p>
                    <p className="font-medium font-mono">0300-1234567</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    <strong>Important:</strong> Please include your full name in
                    the payment reference so we can match it to your account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Receipt */}
          <Card className="glass">
            <CardContent className="p-6">
              <h2 className="font-heading font-semibold text-lg mb-4">
                Upload Payment Receipt
              </h2>

              <div className="space-y-5">
                {/* Sender Name */}
                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name (on payment)</Label>
                  <Input
                    id="senderName"
                    placeholder="Name used in bank transfer"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    required
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Receipt Screenshot</Label>

                  {!file ? (
                    <label
                      htmlFor="receipt"
                      className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, WebP or PDF — Max 5MB
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        id="receipt"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                  ) : (
                    <div className="relative p-4 border border-border rounded-xl bg-secondary/20">
                      <button
                        type="button"
                        onClick={clearFile}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {preview ? (
                        <img
                          src={preview}
                          alt="Receipt preview"
                          className="w-full max-h-40 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center gap-3 py-2">
                          <FileImage className="h-8 w-8 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack} className="press">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!file || submitting}
            className="press"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                Submit Enrollment
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your enrollment will be reviewed within 24–48 hours.
        </p>
      </div>
    );
  }

  // ─── STEP 3: Confirmation ──────────────────────────────

  function ConfirmationStep() {
    return (
      <Card className="glass">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h2 className="font-heading text-2xl font-bold mb-2">
            Enrollment Submitted!
          </h2>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Thank you for enrolling in <strong>{offeringTitle}</strong>. Your
            payment receipt has been submitted for review.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            We&apos;ll review your payment and approve your enrollment within
            24–48 hours. You&apos;ll be able to see the status on your
            dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                router.push("/dashboard/student");
                router.refresh();
              }}
              className="press"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/catalog")}
              className="press"
            >
              Browse More Programs
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <div>
      <StepIndicator />

      {currentStep === 0 && <PersonalDetailsStep />}
      {currentStep === 1 && <PaymentStep />}
      {currentStep === 2 && <ConfirmationStep />}
    </div>
  );
}
