/**
 * Enrollment Wizard — smart multi-step form with 3 user paths.
 *
 * PATH 1 (Express):   Logged in → pre-filled details, confirm + pay → done
 * PATH 2 (Returning): Email found → prompt login or continue as guest
 * PATH 3 (New):       Full form → pay → done
 *
 * Free offerings (price=0) skip the payment step entirely.
 */
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  User,
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileImage,
  X,
  Loader2,
  LogIn,
  Sparkles,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { formatPriceWithFee, APP_NAME } from "@/lib/constants";
import { toast } from "sonner";
import {
  checkEmail,
  checkExistingEnrollment,
  submitGuestEnrollment,
  submitLoggedInEnrollment,
} from "./actions";
import type { OfferingType, FeeType, StudentDetails } from "@/lib/types/database";

// ─── Types ─────────────────────────────────────────────────

interface EnrollmentWizardProps {
  offeringId: string;
  offeringTitle: string;
  offeringType: OfferingType;
  offeringPrice: number;
  offeringFeeType: FeeType;
  offeringSlug: string;
  isLoggedIn: boolean;
  userEmail: string;
  prefill: {
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    age: string;
    educationLevel: string;
    referralSource: string;
  };
}

type WizardPath = "express" | "returning" | "new" | null;

// ─── Constants ─────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────

export function EnrollmentWizard({
  offeringId,
  offeringTitle,
  offeringType,
  offeringPrice,
  offeringFeeType,
  offeringSlug,
  isLoggedIn,
  userEmail,
  prefill,
}: EnrollmentWizardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFree = offeringPrice === 0;

  // ─── Wizard State ────────────────────────────────────────

  // For logged-in users, skip email step → go straight to details (step 0)
  const [path, setPath] = useState<WizardPath>(isLoggedIn ? "express" : null);
  const [currentStep, setCurrentStep] = useState(0);

  // Step 0: Email
  const [email, setEmail] = useState(userEmail);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [returningFirstName, setReturningFirstName] = useState("");

  // Step 1: Personal details
  const [details, setDetails] = useState<StudentDetails>({
    first_name: prefill.firstName,
    last_name: prefill.lastName,
    phone: prefill.phone,
    city: prefill.city,
    age: prefill.age,
    education_level: prefill.educationLevel,
    referral_source: prefill.referralSource,
    message: "",
  });

  // Step 2: Payment (skipped for free offerings)
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [senderName, setSenderName] = useState(
    prefill.firstName ? `${prefill.firstName} ${prefill.lastName}`.trim() : ""
  );

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedReceiptPath, setUploadedReceiptPath] = useState<string | null>(null);
  const [paymentRegion, setPaymentRegion] = useState<"pk" | "in">("pk");

  // ─── Dynamic Steps ───────────────────────────────────────

  const steps = [
    ...(isLoggedIn ? [] : [{ icon: Mail, label: "Email" }]),
    { icon: User, label: "Your Details" },
    ...(isFree ? [] : [{ icon: CreditCard, label: "Payment" }]),
    { icon: CheckCircle, label: "Done" },
  ];

  // ─── Helpers ─────────────────────────────────────────────

  function updateDetail(key: keyof StudentDetails, value: string) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  // ─── Step 0: Email Check ─────────────────────────────────

  async function handleEmailSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setCheckingEmail(true);
    try {
      // Check if already enrolled in this offering
      const enrollmentCheck = await checkExistingEnrollment(trimmed, offeringId);
      if (enrollmentCheck.exists) {
        if (enrollmentCheck.status === "pending") {
          toast.error("You've already applied for this offering. Your application is under review.");
        } else if (enrollmentCheck.status === "approved") {
          toast.error("You're already enrolled in this offering!");
        } else {
          // Rejected — allow re-apply, continue to form
        }
        if (enrollmentCheck.status !== "rejected") {
          setCheckingEmail(false);
          return;
        }
      }

      // Check if email exists in our system
      const result = await checkEmail(trimmed);

      if (result.exists) {
        setPath("returning");
        setReturningFirstName(result.firstName || "");
      } else {
        setPath("new");
        goToStep(1);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCheckingEmail(false);
    }
  }

  function handleContinueAsGuest() {
    setPath("new");
    goToStep(1);
  }

  function handleLoginRedirect() {
    // Redirect to login with return URL back to this enrollment
    router.push(`/login?redirect=/offerings/${offeringSlug}/enroll`);
  }

  // ─── Step 1: Validation ──────────────────────────────────

  function validateDetails(): boolean {
    if (!details.first_name.trim()) {
      toast.error("Please enter your first name.");
      return false;
    }
    if (!details.last_name.trim()) {
      toast.error("Please enter your last name.");
      return false;
    }
    if (!details.phone.trim()) {
      toast.error("Please enter your WhatsApp number.");
      return false;
    }
    if (!details.city.trim()) {
      toast.error("Please enter your city.");
      return false;
    }
    return true;
  }

  // ─── Navigation ──────────────────────────────────────────

  function goToStep(step: number) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    // From details step
    const detailsStepIndex = isLoggedIn ? 0 : 1;
    if (currentStep === detailsStepIndex && !validateDetails()) return;

    if (isFree && currentStep === detailsStepIndex) {
      // Free offering: skip payment, submit directly
      handleSubmit();
      return;
    }

    goToStep(currentStep + 1);
  }

  function goBack() {
    goToStep(Math.max(currentStep - 1, 0));
  }

  // ─── File Handling ───────────────────────────────────────

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

  // ─── Convert file to base64 for server action ───────────

  const fileToBase64 = useCallback(async (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }, []);

  // ─── Submit ──────────────────────────────────────────────

  async function handleSubmit() {
    if (!isFree && !file) {
      toast.error("Please upload your payment receipt.");
      return;
    }
    if (!isFree && !senderName.trim()) {
      toast.error("Please enter the sender name on the payment.");
      return;
    }

    setSubmitting(true);

    try {
      let receiptBase64: string | null = null;
      if (file) {
        receiptBase64 = await fileToBase64(file);
      }

      const input = {
        offeringId,
        email: email.trim().toLowerCase(),
        details,
        paymentAmount: offeringPrice,
        receiptBase64,
        receiptFileName: file?.name || null,
        senderName: senderName || null,
        existingReceiptPath: uploadedReceiptPath,
      };

      const result = isLoggedIn
        ? await submitLoggedInEnrollment(input)
        : await submitGuestEnrollment(input);

      if (!result.success) {
        // Save uploaded receipt path so retry doesn't re-upload
        if (result.uploadedReceiptPath) {
          setUploadedReceiptPath(result.uploadedReceiptPath);
        }
        toast.error(result.error || "Something went wrong.");
        return;
      }

      // Move to success step
      setSubmitted(true);
      goToStep(steps.length - 1);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //   RENDER SECTIONS
  // ═══════════════════════════════════════════════════════════

  // ─── Step Indicator ────────────────────────────────────────

  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-0 mb-10">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep || submitted;
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
                  {isCompleted && !isActive ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    isActive || isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 sm:w-16 mx-1.5 sm:mx-2 mb-0 sm:mb-6 ${
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

  // ─── STEP 0: Email Entry (guests only) ─────────────────────

  function EmailStep() {
    // PATH 2: Email found — show "Welcome back" card
    if (path === "returning") {
      return (
        <Card className="glass">
          <CardContent className="p-6 md:p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>

              <h2 className="font-heading font-semibold text-xl mb-2">
                Welcome back{returningFirstName ? `, ${returningFirstName}` : ""}!
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                We found your account. Log in for a faster enrollment experience
                with your details pre-filled.
              </p>

              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full press"
                  onClick={handleLoginRedirect}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Log In for Express Enrollment
                </Button>

                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  Continue as a new application instead
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default: email input
    return (
      <Card className="glass">
        <CardContent className="p-6 md:p-8">
          <div className="max-w-md mx-auto">
            <h2 className="font-heading font-semibold text-lg mb-1">
              Let&apos;s Get Started
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your email address to begin your enrollment.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleEmailSubmit();
                    }
                  }}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll use this to send you enrollment updates and account credentials.
                </p>
              </div>

              <Button
                size="lg"
                className="w-full press"
                onClick={handleEmailSubmit}
                disabled={checkingEmail}
              >
                {checkingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── STEP 1: Personal Details ──────────────────────────────

  function PersonalDetailsStep() {
    const isExpress = path === "express";

    return (
      <Card className="glass">
        <CardContent className="p-6 md:p-8">
          {isExpress ? (
            <>
              <h2 className="font-heading font-semibold text-lg mb-1">
                Confirm Your Details
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Please verify your information is up to date, then continue.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-heading font-semibold text-lg mb-1">
                Tell Us About Yourself
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                This helps us personalize your learning experience.
              </p>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="e.g. Fatima"
                value={details.first_name}
                onChange={(e) => updateDetail("first_name", e.target.value)}
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="e.g. Ahmed"
                value={details.last_name}
                onChange={(e) => updateDetail("last_name", e.target.value)}
                required
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                WhatsApp Number <span className="text-destructive">*</span>
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
                onChange={(e) => updateDetail("education_level", e.target.value)}
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
                onChange={(e) => updateDetail("referral_source", e.target.value)}
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

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {!isLoggedIn && (
              <Button variant="outline" onClick={goBack} className="press">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <div className={isLoggedIn ? "ml-auto" : ""}>
              <Button size="lg" onClick={goNext} className="press">
                {isFree ? (
                  submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── STEP 2: Payment & Upload (paid offerings only) ────────

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
                    {formatPriceWithFee(offeringPrice, offeringFeeType)}
                  </p>
                </div>

                {/* Region Toggle */}
                <div className="flex rounded-lg bg-secondary p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentRegion("pk")}
                    className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${paymentRegion === "pk" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🇵🇰 Pakistan / International
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentRegion("in")}
                    className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${paymentRegion === "in" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🇮🇳 India
                  </button>
                </div>

                {paymentRegion === "pk" ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="font-medium">Bank Alfalah</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="font-medium">Sana Ahmed</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="font-medium font-mono">56185002604899</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IBAN</p>
                      <p className="font-medium font-mono text-xs sm:text-sm">PK81ALFH5618005002604899</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="font-medium">HDFC Bank</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="font-medium">Kareemunnisa Shaik</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="font-medium font-mono">50100433613784</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IFSC Code</p>
                      <p className="font-medium font-mono">HDFC0009377</p>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    <strong>Important:</strong> Please include your full name in
                    the payment reference so we can match it to your application.
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
                Submit Application
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your application will be reviewed within 24 hours.
        </p>
      </div>
    );
  }

  // ─── SUCCESS STEP: Beautiful motivational message ──────────

  function SuccessStep() {
    return (
      <Card className="glass overflow-hidden">
        {/* Decorative gradient header */}
        <div className="h-2 bg-gradient-to-r from-primary via-amber-400 to-primary" />

        <CardContent className="p-8 md:p-12 text-center">
          <div className="h-20 w-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-6">
            <Heart className="h-10 w-10 text-green-600 fill-green-600" />
          </div>

          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            Application Received!
          </h2>

          <div className="max-w-lg mx-auto space-y-4 mb-8">
            <p className="text-muted-foreground">
              Jazakillahu Khairan for applying to{" "}
              <strong className="text-foreground">{offeringTitle}</strong>. We&apos;re
              delighted to have you on this journey of knowledge.
            </p>

            <div className="p-4 rounded-xl bg-secondary/60 text-sm space-y-2">
              <p className="font-medium text-foreground">What happens next?</p>
              <ul className="text-muted-foreground space-y-1.5 text-left">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Our team will review your application within <strong>24 hours</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    You&apos;ll receive an email at <strong>{email}</strong> with your
                    enrollment status and login credentials
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Keep checking your inbox (and spam folder, just in case!)</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground italic">
              &ldquo;Seeking knowledge is an obligation upon every Muslim.&rdquo;
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => router.push("/catalog")}
              className="press"
            >
              Explore More Programs
            </Button>
            {isLoggedIn && (
              <Button
                onClick={() => {
                  router.push("/dashboard/student");
                  router.refresh();
                }}
                className="press"
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Main Render ───────────────────────────────────────────

  // Build step-to-content mapping aligned with the steps array.
  // Each entry here corresponds to the step at the same index.
  const stepContent: React.ReactNode[] = [
    ...(isLoggedIn ? [] : [<EmailStep key="email" />]),
    <PersonalDetailsStep key="details" />,
    ...(isFree ? [] : [<PaymentStep key="payment" />]),
    submitted ? <SuccessStep key="success" /> : null,
  ];

  return (
    <div>
      <StepIndicator />
      {stepContent[currentStep]}
    </div>
  );
}
