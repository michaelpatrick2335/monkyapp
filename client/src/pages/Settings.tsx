import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import monkyCircle from "@/assets/monkey_circle.jpeg";

// Resolve API base the same way queryClient does (handles deployed port proxy)
const API_BASE = ("__PORT_5000__" as string).startsWith("__") ? "" : "__PORT_5000__";
import { VOICE_CUES, type VoiceCueId } from "@/components/BreathChallenge";
import type { User } from "@shared/schema";

interface SettingsProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
}

const TIER_OPTIONS = [
  {
    key: "newbie",
    label: "Newbie",
    emoji: "🌱",
    color: "#4ade80",
    startLevel: 1,
    range: "Levels 1–249",
    duration: "Starts at 1:00 min",
    description: "Short, beginner-friendly sessions. Perfect for building the habit.",
  },
  {
    key: "experienced",
    label: "Experienced",
    emoji: "🔥",
    color: "#f59e0b",
    startLevel: 250,
    range: "Levels 250–499",
    duration: "Starts at 10:00 min",
    description: "Deeper sits. You know how to settle in.",
  },
  {
    key: "enlightened",
    label: "Enlightened",
    emoji: "✨",
    color: "#a78bfa",
    startLevel: 500,
    range: "Levels 500–1000",
    duration: "Starts at 20:00 min",
    description: "Long, immersive sessions for seasoned meditators.",
  },
];

export function Settings({ user, onBack, onLogout }: SettingsProps) {
  const [showLevelChange, setShowLevelChange] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [changed, setChanged] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, "ok" | "error">>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Profile picture
  const [profilePicUploading, setProfilePicUploading] = useState(false);
  const [profilePicError, setProfilePicError] = useState<string | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    user.profilePic ? `${("__PORT_5000__" as string).startsWith("__") ? "" : "__PORT_5000__"}/api/profile-pic/file?t=${Date.now()}` : null
  );
  const profilePicInputRef = useRef<HTMLInputElement | null>(null);

  async function handleProfilePicUpload(file: File) {
    setProfilePicUploading(true);
    setProfilePicError(null);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`${API_BASE}/api/profile-pic`, { method: "POST", body: formData });
      if (res.ok) {
        const ts = Date.now();
        setProfilePicPreview(`${API_BASE}/api/profile-pic/file?t=${ts}`);
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      } else {
        const text = await res.text();
        setProfilePicError(`Upload failed: ${res.status} — ${text.slice(0, 80)}`);
      }
    } catch (e: any) {
      setProfilePicError(`Upload error: ${e?.message || "unknown"}`);
    } finally {
      setProfilePicUploading(false);
    }
  }

  async function handleRemoveProfilePic() {
    await fetch(`${API_BASE}/api/profile-pic`, { method: "DELETE" });
    setProfilePicPreview(null);
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Which cues have uploaded files
  const { data: uploadedCues = {}, refetch: refetchCues } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/voice"],
    enabled: showVoiceStudio,
  });

  async function handleVoiceUpload(cueId: VoiceCueId, file: File) {
    setUploadingId(cueId);
    setUploadStatus(s => ({ ...s, [cueId]: undefined as any }));
    const formData = new FormData();
    formData.append("audio", file);
    try {
      const res = await fetch(`${API_BASE}/api/voice/${cueId}`, { method: "POST", body: formData });
      if (res.ok) {
        setUploadStatus(s => ({ ...s, [cueId]: "ok" }));
        refetchCues();
      } else {
        setUploadStatus(s => ({ ...s, [cueId]: "error" }));
      }
    } catch {
      setUploadStatus(s => ({ ...s, [cueId]: "error" }));
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDeleteCue(cueId: VoiceCueId) {
    await fetch(`${API_BASE}/api/voice/${cueId}`, { method: "DELETE" });
    setUploadStatus(s => ({ ...s, [cueId]: undefined as any }));
    refetchCues();
  }

  function previewCue(cueId: VoiceCueId) {
    const audio = new Audio(`${API_BASE}/api/voice/${cueId}`);
    audio.play().catch(() => {});
  }

  const changeLevelMutation = useMutation({
    mutationFn: (tier: string) => apiRequest("POST", "/api/change-level", { tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setChanged(true);
      setTimeout(() => {
        setChanged(false);
        setShowLevelChange(false);
        onBack();
      }, 1600);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.clear();
      onLogout();
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-8 stars-bg overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-sm flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="font-display font-bold text-foreground text-xl">Settings</h1>
      </div>

      {/* User card */}
      <div className="glass-card rounded-3xl p-5 w-full max-w-sm mb-5 flex items-center gap-4">
        {/* Tappable profile pic */}
        <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
          <input
            ref={profilePicInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="input-profile-pic"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleProfilePicUpload(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => profilePicInputRef.current?.click()}
            disabled={profilePicUploading}
            data-testid="button-profile-pic"
            style={{
              width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
              background: "#0d1520", border: "2.5px solid rgba(245,200,66,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative",
            }}
          >
            <img
              src={profilePicPreview || monkyCircle}
              alt="Profile"
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                objectPosition: profilePicPreview ? "center" : "center 20%",
                opacity: profilePicUploading ? 0.4 : 1,
                transition: "opacity 0.2s",
              }}
            />
            {/* Camera overlay */}
            <div
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--color-gold)", display: "flex",
                alignItems: "center", justifyContent: "center",
                border: "2px solid #0d0f1a",
              }}
            >
              {profilePicUploading ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a0a00" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a0a00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </div>
          </button>
        </div>

        <div className="flex-1">
          <p className="font-display font-bold text-foreground text-base">{user.name}</p>
          <p className="text-muted-foreground text-xs">Level {user.level} · {user.bananas} 🍌</p>
          <p className="text-xs mt-0.5" style={{ color: user.tier === "enlightened" ? "#a78bfa" : user.tier === "experienced" ? "#f59e0b" : "#4ade80" }}>
            {user.tier === "enlightened" ? "✨ Enlightened" : user.tier === "experienced" ? "🔥 Experienced" : "🌱 Newbie"}
          </p>
          {user.email && (
            <p className="text-xs mt-1 opacity-50" style={{ color: "var(--muted-foreground)", wordBreak: "break-all" }}>
              {user.email}
            </p>
          )}
          {/* Change / Remove links */}
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => profilePicInputRef.current?.click()}
              className="text-xs font-bold transition-colors"
              style={{ color: "var(--color-gold)" }}
              data-testid="button-change-pic-text"
            >
              {profilePicPreview ? "Change Photo" : "Add Photo"}
            </button>
            {profilePicPreview && (
              <button
                onClick={handleRemoveProfilePic}
                className="text-xs transition-colors"
                style={{ color: "#f87171" }}
                data-testid="button-remove-pic"
              >
                Remove
              </button>
            )}
          </div>
          {profilePicError && (
            <p className="text-xs mt-1" style={{ color: "#f87171" }}>{profilePicError}</p>
          )}
        </div>
      </div>

      {/* Change Level section */}
      <div className="glass-card rounded-3xl p-5 w-full max-w-sm mb-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowLevelChange(s => !s)}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎚️</span>
            <div className="text-left">
              <p className="font-display font-bold text-foreground text-sm">Change Difficulty Level</p>
              <p className="text-muted-foreground text-xs">Switch to a different tier</p>
            </div>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showLevelChange ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--muted-foreground)" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showLevelChange && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground text-center mb-1">
              Pick a tier — your level resets to the start of that tier. Your bananas and rank stay.
            </p>

            {changed && (
              <div className="text-center py-4">
                <div className="text-3xl mb-2 level-up">🙏</div>
                <p className="font-display text-gold font-bold">Level reset!</p>
              </div>
            )}

            {!changed && TIER_OPTIONS.map((tier) => {
              const isCurrent = user.tier === tier.key;
              return (
                <button
                  key={tier.key}
                  onClick={() => !isCurrent && changeLevelMutation.mutate(tier.key)}
                  disabled={isCurrent || changeLevelMutation.isPending}
                  className="rounded-2xl p-4 text-left transition-all active:scale-95 hover:scale-[1.01] disabled:opacity-60"
                  style={{
                    background: isCurrent ? `${tier.color}15` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${isCurrent ? tier.color + "50" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-sm" style={{ color: tier.color }}>
                      {tier.emoji} {tier.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{tier.range}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{tier.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: tier.color + "cc" }}>Starts at Level {tier.startLevel}</span>
                    {isCurrent && (
                      <span className="text-xs font-bold" style={{ color: tier.color }}>← Current</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Voice Studio */}
      <div className="glass-card rounded-3xl p-5 w-full max-w-sm mb-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowVoiceStudio(s => !s)}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎙️</span>
            <div className="text-left">
              <p className="font-display font-bold text-foreground text-sm">Voice Studio</p>
              <p className="text-muted-foreground text-xs">Upload your own voice for breath exercises</p>
            </div>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showVoiceStudio ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--muted-foreground)" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showVoiceStudio && (
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground leading-relaxed mb-1">
              Record yourself saying each cue and upload the MP3 or WAV. The app plays your voice during breathing exercises.
            </p>

            {VOICE_CUES.map((cue) => {
              const hasFile = uploadedCues[cue.id];
              const isUploading = uploadingId === cue.id;
              const status = uploadStatus[cue.id];

              return (
                <div
                  key={cue.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: hasFile ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${hasFile ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-display font-bold text-foreground text-sm">{cue.label}</p>
                      <p className="text-xs text-muted-foreground">{cue.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasFile && (
                        <>
                          {/* Preview */}
                          <button
                            onClick={() => previewCue(cue.id as VoiceCueId)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}
                            title="Preview"
                            data-testid={`button-preview-${cue.id}`}
                          >
                            ▶
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteCue(cue.id as VoiceCueId)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
                            title="Remove"
                            data-testid={`button-delete-${cue.id}`}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Upload area */}
                  <input
                    ref={el => { fileInputRefs.current[cue.id] = el; }}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    data-testid={`input-voice-${cue.id}`}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleVoiceUpload(cue.id as VoiceCueId, file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileInputRefs.current[cue.id]?.click()}
                    disabled={isUploading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: hasFile ? "rgba(245,200,66,0.1)" : "rgba(245,200,66,0.12)",
                      border: "1px solid rgba(245,200,66,0.3)",
                      color: "var(--color-gold)",
                    }}
                    data-testid={`button-upload-${cue.id}`}
                  >
                    {isUploading ? "Uploading…" : hasFile ? "Replace Recording" : "+ Upload Recording"}
                  </button>

                  {status === "ok" && (
                    <p className="text-xs text-green-400 mt-1.5 text-center">✓ Uploaded successfully</p>
                  )}
                  {status === "error" && (
                    <p className="text-xs text-red-400 mt-1.5 text-center">Upload failed — try again</p>
                  )}
                </div>
              );
            })}

            <p className="text-xs text-muted-foreground text-center mt-1 opacity-60">
              Supported: MP3, WAV, M4A · Max 10MB per file
            </p>
          </div>
        )}
      </div>


      {/* Logout section */}
      <div className="glass-card rounded-3xl p-5 w-full max-w-sm mb-4">
        {!showLogoutConfirm ? (
          <button
            className="w-full flex items-center gap-3"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <span className="text-xl">🚪</span>
            <div className="text-left">
              <p className="font-display font-bold text-foreground text-sm">Log Out</p>
              <p className="text-muted-foreground text-xs">Reset and start fresh</p>
            </div>
          </button>
        ) : (
          <div>
            <p className="font-display font-bold text-foreground text-sm mb-1">Are you sure?</p>
            <p className="text-muted-foreground text-xs mb-4">
              This will log you out and clear your progress so you can start over from onboarding.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-display font-bold text-muted-foreground"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="flex-1 py-2.5 rounded-2xl text-sm font-display font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
              >
                {logoutMutation.isPending ? "Logging out..." : "Log Out"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Version */}
      <p className="text-xs text-muted-foreground mt-6 opacity-40">MONKy v1.0</p>
    </div>
  );
}
