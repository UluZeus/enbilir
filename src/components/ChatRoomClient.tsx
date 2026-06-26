"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChatRoom = {
  id: string;
  code: string;
  name: string;
  type: "GENERAL" | "PRIVATE";
};

type ChatMessage = {
  id: string;
  type: "TEXT" | "FILE" | "IMAGE" | "VIDEO" | "LOCATION" | "CONTACT" | "POLL";
  body: string;
  attachment: Record<string, unknown> | null;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
  };
  isMine: boolean;
  poll: null | {
    totalVotes: number;
    options: Array<{
      id: string;
      label: string;
      voteCount: number;
      votedByMe: boolean;
    }>;
  };
};

type OnlineUser = {
  id: string;
  displayName: string;
  lastSeenAt: string;
  isMe: boolean;
};

type ChatState = {
  room: ChatRoom;
  rooms: ChatRoom[];
  messages: ChatMessage[];
  onlineUsers: OnlineUser[];
  currentUser: {
    id: string;
    displayName: string;
  };
};

type ChatRoomClientProps = {
  locale: string;
  authenticated: boolean;
  loginHref: string;
  initialRoomCode: string;
  initialState: ChatState | null;
};

function getCopy(locale: string) {
  if (locale === "en") {
    return {
      eyebrow: "Live community room",
      title: "Enbilir Chat",
      intro: "General room is open to signed-in members. Private rooms can be opened with a shareable room link.",
      ruleTitle: "Before joining",
      ruleBody:
        "Please write with respect, avoid personal attacks, do not share private financial information, and remember that this is an education-focused community area.",
      disclaimer:
        "Messages written here are the personal views of the users. They do not bind Enbilir, the site management, or Dr. Hakan Unsal, and they must not be read as investment advice.",
      loginTitle: "Sign in to join the chat",
      loginBody: "Chat rooms are only available to signed-in members so names or nicknames can be shown correctly.",
      signIn: "Sign in",
      generalRoom: "General room",
      privateRooms: "Private rooms",
      createPrivate: "Create private room",
      roomName: "Room name",
      roomNamePlaceholder: "Example: Friday portfolio notes",
      joinByCode: "Join by code",
      roomCodePlaceholder: "oda-...",
      join: "Join",
      inviteLink: "Private room link",
      copyLink: "Copy link",
      copied: "Copied",
      online: "Online",
      noOnline: "No one else is visible yet.",
      messagePlaceholder: "Write a respectful message...",
      send: "Send",
      empty: "No messages yet. Start with a short hello or a learning question.",
      loading: "Chat is loading...",
      error: "Chat could not be loaded.",
      currentRoom: "Current room",
      privateBadge: "Private",
      generalBadge: "General",
      you: "you",
      modes: {
        TEXT: "Text",
        FILE: "File / image / video",
        LOCATION: "Location",
        CONTACT: "Contact",
        POLL: "Poll",
      },
      fileSelect: "Choose file",
      locationLabel: "Location label",
      latitude: "Latitude",
      longitude: "Longitude",
      useMyLocation: "Use my location",
      contactName: "Contact name",
      phone: "Phone",
      email: "Email",
      pollQuestion: "Poll question",
      pollOptions: "Options, one per line",
      vote: "Vote",
      votes: "votes",
      download: "Open file",
      uploadError: "File could not be uploaded.",
    };
  }

  return {
    eyebrow: "Canlı topluluk odası",
    title: "Enbilir Sohbet",
    intro: "Genel oda giriş yapan herkese açıktır. Özel odalar paylaşılabilir oda linkiyle arkadaşlara gönderilebilir.",
    ruleTitle: "Sohbete girmeden önce",
    ruleBody:
      "Lütfen saygılı bir dil kullanın, kişisel saldırıdan kaçının, özel finansal bilgilerinizi paylaşmayın ve buranın eğitim odaklı bir topluluk alanı olduğunu unutmayın.",
    disclaimer:
      "Burada yazılanlar kullanıcıların kişisel düşünceleridir. Enbilir'i, site yönetimini veya Dr. Hakan Ünsal'ı bağlamaz; yatırım tavsiyesi olarak okunmamalıdır.",
    loginTitle: "Sohbete katılmak için giriş yap",
    loginBody: "Sohbet odalarında adın veya seçtiğin rumuz doğru görünsün diye önce oturum açmalısın.",
    signIn: "Giriş yap",
    generalRoom: "Genel oda",
    privateRooms: "Özel odalar",
    createPrivate: "Özel oda aç",
    roomName: "Oda adı",
    roomNamePlaceholder: "Örnek: Cuma portföy notları",
    joinByCode: "Kod ile katıl",
    roomCodePlaceholder: "oda-...",
    join: "Katıl",
    inviteLink: "Özel oda linki",
    copyLink: "Linki kopyala",
    copied: "Kopyalandı",
    online: "Çevrimiçi",
    noOnline: "Henüz görünür başka kimse yok.",
    messagePlaceholder: "Saygılı bir mesaj yaz...",
    send: "Gönder",
    empty: "Henüz mesaj yok. Kısa bir merhaba veya öğrenme sorusuyla başlayabilirsin.",
    loading: "Sohbet yükleniyor...",
    error: "Sohbet yüklenemedi.",
    currentRoom: "Aktif oda",
    privateBadge: "Özel",
    generalBadge: "Genel",
    you: "sen",
    modes: {
      TEXT: "Metin",
      FILE: "Dosya / resim / video",
      LOCATION: "Konum",
      CONTACT: "Kişi",
      POLL: "Anket",
    },
    fileSelect: "Dosya seç",
    locationLabel: "Konum açıklaması",
    latitude: "Enlem",
    longitude: "Boylam",
    useMyLocation: "Mevcut konumu al",
    contactName: "Kişi adı",
    phone: "Telefon",
    email: "E-posta",
    pollQuestion: "Anket sorusu",
    pollOptions: "Seçenekler, her satıra bir seçenek",
    vote: "Oy ver",
    votes: "oy",
    download: "Dosyayı aç",
    uploadError: "Dosya yüklenemedi.",
  };
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ChatRoomClient({ locale, authenticated, loginHref, initialRoomCode, initialState }: ChatRoomClientProps) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [state, setState] = useState<ChatState | null>(initialState);
  const [activeRoomCode, setActiveRoomCode] = useState(initialState?.room.code ?? initialRoomCode);
  const [composerMode, setComposerMode] = useState<ChatMessage["type"]>("TEXT");
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [privateRoomName, setPrivateRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(authenticated ? (initialState ? "ready" : "idle") : "login");
  const [error, setError] = useState("");
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const roomUrl = useMemo(() => {
    if (typeof window === "undefined" || !state?.room) {
      return "";
    }

    return `${window.location.origin}/${locale}/sohbet?oda=${state.room.code}`;
  }, [locale, state?.room]);

  const loadRoom = useCallback(async (roomCode: string, options?: { quiet?: boolean }) => {
    if (!authenticated) {
      return;
    }

    if (!options?.quiet) {
      setStatus("loading");
    }

    try {
      const response = await fetch(`/api/chat/rooms?roomCode=${encodeURIComponent(roomCode)}`, {
        cache: "no-store",
      });
      const payload = await response.json() as ChatState & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || copy.error);
      }

      setState(payload);
      setActiveRoomCode(payload.room.code);
      setError("");
      setStatus("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.error);
      setStatus("error");
    }
  }, [authenticated, copy.error]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadRoom(activeRoomCode);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeRoomCode, authenticated, loadRoom]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadRoom(activeRoomCode, { quiet: true });
    }, 4_000);

    return () => window.clearInterval(timer);
  }, [activeRoomCode, authenticated, loadRoom]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight });
  }, [state?.messages.length, state?.room.code]);

  function updateUrl(roomCode: string) {
    const nextUrl = roomCode === "genel" ? `/${locale}/sohbet` : `/${locale}/sohbet?oda=${encodeURIComponent(roomCode)}`;
    window.history.replaceState(null, "", nextUrl);
  }

  async function selectRoom(roomCode: string) {
    updateUrl(roomCode);
    setActiveRoomCode(roomCode);
  }

  async function createPrivateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: privateRoomName }),
      });
      const payload = await response.json() as ChatState & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || copy.error);
      }

      setPrivateRoomName("");
      setState(payload);
      setActiveRoomCode(payload.room.code);
      updateUrl(payload.room.code);
      setInviteLink(`${window.location.origin}/${locale}/sohbet?oda=${payload.room.code}`);
      setStatus("ready");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : copy.error);
      setStatus("error");
    }
  }

  async function joinPrivateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.trim().toLowerCase();

    if (!code) {
      return;
    }

    setJoinCode("");
    await selectRoom(code);
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      throw new Error(copy.fileSelect);
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("/api/chat/uploads", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json() as { attachment?: Record<string, unknown>; error?: string };

    if (!response.ok || !payload.attachment) {
      throw new Error(payload.error || copy.uploadError);
    }

    return payload.attachment;
  }

  function resetComposer() {
    setMessage("");
    setSelectedFile(null);
    setLocationLabel("");
    setLatitude("");
    setLongitude("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setPollOptions("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = message.trim();

    if (!state) {
      return;
    }

    let type = composerMode;
    let attachment: Record<string, unknown> | null = null;
    let options: string[] = [];

    try {
      if (composerMode === "FILE" || composerMode === "IMAGE" || composerMode === "VIDEO") {
        attachment = await uploadSelectedFile();
        type = typeof attachment.kind === "string" ? attachment.kind as ChatMessage["type"] : "FILE";
      }

      if (composerMode === "LOCATION") {
        attachment = {
          label: locationLabel.trim(),
          latitude: Number.parseFloat(latitude),
          longitude: Number.parseFloat(longitude),
        };
      }

      if (composerMode === "CONTACT") {
        attachment = {
          name: contactName.trim(),
          phone: contactPhone.trim(),
          email: contactEmail.trim(),
        };
      }

      if (composerMode === "POLL") {
        options = pollOptions.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
      }

      if (composerMode === "TEXT" && !body) {
        return;
      }

      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: state.room.code, message: body, type, attachment, pollOptions: options }),
      });
      const payload = await response.json() as ChatState & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || copy.error);
      }

      setState(payload);
      resetComposer();
      setError("");
      setStatus("ready");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : copy.error);
      setStatus("error");
    }
  }

  function useCurrentLocation() {
    navigator.geolocation?.getCurrentPosition((position) => {
      setLatitude(position.coords.latitude.toFixed(6));
      setLongitude(position.coords.longitude.toFixed(6));
    });
  }

  async function votePoll(messageId: string, optionId: string) {
    const response = await fetch("/api/chat/polls/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, optionId }),
    });
    const payload = await response.json() as ChatState & { error?: string };

    if (!response.ok) {
      setError(payload.error || copy.error);
      return;
    }

    setState(payload);
    setError("");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function copyInviteLink() {
    const link = inviteLink || roomUrl;

    if (!link) {
      return;
    }

    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  const generalRooms = state?.rooms.filter((room) => room.type === "GENERAL") ?? [];
  const privateRooms = state?.rooms.filter((room) => room.type === "PRIVATE") ?? [];

  return (
    <div className="grid gap-5">
      <section className="premium-card p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{copy.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#152033]">{copy.title}</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{copy.intro}</p>
          </div>
          {state ? (
            <div className="rounded-lg border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.currentRoom}</p>
              <p className="mt-1 font-black text-[#152033]">{state.room.name}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <p className="font-black">{copy.ruleTitle}</p>
        <p className="mt-2 text-sm leading-7">{copy.ruleBody}</p>
        <p className="mt-2 text-sm leading-7 font-semibold">{copy.disclaimer}</p>
      </section>

      {!authenticated ? (
        <section className="premium-card p-6">
          <h2 className="text-xl font-black text-[#152033]">{copy.loginTitle}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{copy.loginBody}</p>
          <Link href={loginHref} className="premium-action mt-4 inline-flex px-4 py-2 text-sm font-black">
            {copy.signIn}
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)_260px]">
          <aside className="premium-card grid content-start gap-5 p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.generalRoom}</p>
              <div className="mt-3 grid gap-2">
                {generalRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => void selectRoom(room.code)}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-black transition ${
                      room.code === activeRoomCode
                        ? "border-[#0f766e] bg-[#0f766e] text-white"
                        : "border-slate-200 bg-white text-[#152033] hover:border-[#0f766e]"
                    }`}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={createPrivateRoom} className="grid gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.createPrivate}</p>
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                {copy.roomName}
                <input
                  value={privateRoomName}
                  onChange={(event) => setPrivateRoomName(event.target.value)}
                  placeholder={copy.roomNamePlaceholder}
                  maxLength={60}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0f766e]"
                />
              </label>
              <button className="premium-action px-4 py-2 text-sm font-black">{copy.createPrivate}</button>
            </form>

            <form onSubmit={joinPrivateRoom} className="grid gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.joinByCode}</p>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder={copy.roomCodePlaceholder}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0f766e]"
              />
              <button className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#152033] hover:border-[#0f766e]">
                {copy.join}
              </button>
            </form>

            {privateRooms.length > 0 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.privateRooms}</p>
                <div className="mt-3 grid gap-2">
                  {privateRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => void selectRoom(room.code)}
                      className={`rounded-lg border px-3 py-3 text-left text-sm font-black transition ${
                        room.code === activeRoomCode
                          ? "border-[#152033] bg-[#152033] text-white"
                          : "border-slate-200 bg-white text-[#152033] hover:border-[#152033]"
                      }`}
                    >
                      <span className="block truncate">{room.name}</span>
                      <span className="mt-1 block text-xs font-semibold opacity-75">{room.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <section className="premium-card grid min-h-[620px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-white/80 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-[#152033]">{state?.room.name ?? copy.loading}</h2>
                    {state ? (
                      <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                        {state.room.type === "PRIVATE" ? copy.privateBadge : copy.generalBadge}
                      </span>
                    ) : null}
                  </div>
                  {state?.room.type === "PRIVATE" ? (
                    <p className="mt-1 text-xs font-semibold text-slate-500">{state.room.code}</p>
                  ) : null}
                </div>
                {state?.room.type === "PRIVATE" ? (
                  <button
                    type="button"
                    onClick={() => void copyInviteLink()}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#152033] hover:border-[#0f766e]"
                  >
                    {copied ? copy.copied : copy.copyLink}
                  </button>
                ) : null}
              </div>
              {(inviteLink || state?.room.type === "PRIVATE") && roomUrl ? (
                <div className="mt-3 rounded-md border border-slate-200 bg-[#f8fafc] p-3 text-xs text-slate-600">
                  <span className="font-black text-[#152033]">{copy.inviteLink}: </span>
                  <span className="break-all">{inviteLink || roomUrl}</span>
                </div>
              ) : null}
            </div>

            <div ref={messageListRef} className="grid content-start gap-3 overflow-y-auto bg-[#f8fafc] p-5">
              {status === "loading" && !state ? <p className="text-sm text-slate-600">{copy.loading}</p> : null}
              {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
              {state && state.messages.length === 0 ? (
                <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">{copy.empty}</p>
              ) : null}
              {state?.messages.map((item) => (
                <article key={item.id} className={`max-w-[82%] rounded-lg border p-3 shadow-sm ${item.isMine ? "ml-auto border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-black text-[#152033]">{item.author.displayName}</span>
                    {item.isMine ? <span className="font-bold text-[#0f766e]">({copy.you})</span> : null}
                    <span className="text-slate-400">{formatTime(item.createdAt, locale)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.body}</p>
                  <MessageAttachment message={item} copy={copy} onVote={(optionId) => void votePoll(item.id, optionId)} />
                </article>
              ))}
            </div>

            <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {(["TEXT", "FILE", "LOCATION", "CONTACT", "POLL"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setComposerMode(mode)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-black ${composerMode === mode ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    {copy.modes[mode]}
                  </button>
                ))}
              </div>
              {composerMode === "FILE" ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-[#f8fafc] p-3">
                  <input ref={fileInputRef} type="file" onChange={onFileChange} className="text-sm" />
                  {selectedFile ? <p className="mt-2 text-xs font-bold text-slate-600">{selectedFile.name}</p> : null}
                </div>
              ) : null}
              {composerMode === "LOCATION" ? (
                <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-[#f8fafc] p-3 sm:grid-cols-3">
                  <input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder={copy.locationLabel} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder={copy.latitude} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder={copy.longitude} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={useCurrentLocation} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#152033] sm:col-span-3">
                    {copy.useMyLocation}
                  </button>
                </div>
              ) : null}
              {composerMode === "CONTACT" ? (
                <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-[#f8fafc] p-3 sm:grid-cols-3">
                  <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder={copy.contactName} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder={copy.phone} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder={copy.email} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              ) : null}
              {composerMode === "POLL" ? (
                <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-[#f8fafc] p-3">
                  <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy.pollQuestion} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <textarea value={pollOptions} onChange={(event) => setPollOptions(event.target.value)} rows={3} placeholder={copy.pollOptions} className="resize-none rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={800}
                  rows={2}
                  placeholder={copy.messagePlaceholder}
                  className={`min-h-[52px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0f766e] ${composerMode === "POLL" ? "hidden" : ""}`}
                />
                <button className="premium-action px-5 py-3 text-sm font-black sm:self-stretch">{copy.send}</button>
              </div>
            </form>
          </section>

          <aside className="premium-card content-start p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.online}</p>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0f766e] ring-1 ring-emerald-200">
                {state?.onlineUsers.length ?? 0}
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {state && state.onlineUsers.length === 0 ? <p className="text-sm text-slate-600">{copy.noOnline}</p> : null}
              {state?.onlineUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101827] text-xs font-black text-[#f5a623]">
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#152033]">
                      {user.displayName} {user.isMe ? `(${copy.you})` : ""}
                    </p>
                    <p className="text-xs text-slate-500">{formatTime(user.lastSeenAt, locale)}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function MessageAttachment({
  message,
  copy,
  onVote,
}: {
  message: ChatMessage;
  copy: ReturnType<typeof getCopy>;
  onVote: (optionId: string) => void;
}) {
  const attachment = message.attachment;

  if (message.type === "IMAGE") {
    const url = getString(attachment?.url);

    // User uploads have unknown dimensions, so a plain image preview is more reliable here.
    // eslint-disable-next-line @next/next/no-img-element
    return url ? <img src={url} alt={getString(attachment?.fileName) || message.body} className="mt-3 max-h-72 rounded-lg border border-slate-200 object-contain" /> : null;
  }

  if (message.type === "VIDEO") {
    const url = getString(attachment?.url);

    return url ? <video src={url} controls className="mt-3 max-h-72 rounded-lg border border-slate-200" /> : null;
  }

  if (message.type === "FILE") {
    const url = getString(attachment?.url);

    return url ? (
      <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#0f766e]">
        {copy.download}: {getString(attachment?.fileName) || message.body}
      </a>
    ) : null;
  }

  if (message.type === "LOCATION") {
    const latitude = getNumber(attachment?.latitude);
    const longitude = getNumber(attachment?.longitude);

    return latitude !== null && longitude !== null ? (
      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <p className="font-black text-[#152033]">{getString(attachment?.label) || "Konum"}</p>
        <p className="mt-1 text-slate-600">{latitude}, {longitude}</p>
        <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-black text-[#0f766e]">
          Haritada aç
        </a>
      </div>
    ) : null;
  }

  if (message.type === "CONTACT") {
    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <p className="font-black text-[#152033]">{getString(attachment?.name)}</p>
        {getString(attachment?.phone) ? <p className="mt-1 text-slate-600">{getString(attachment?.phone)}</p> : null}
        {getString(attachment?.email) ? <p className="mt-1 text-slate-600">{getString(attachment?.email)}</p> : null}
      </div>
    );
  }

  if (message.type === "POLL" && message.poll) {
    return (
      <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3">
        {message.poll.options.map((option) => {
          const percent = message.poll?.totalVotes ? Math.round((option.voteCount / message.poll.totalVotes) * 100) : 0;

          return (
            <button key={option.id} type="button" onClick={() => onVote(option.id)} className="rounded-md border border-slate-200 bg-[#f8fafc] p-2 text-left text-sm">
              <span className="flex items-center justify-between gap-3 font-black text-[#152033]">
                <span>{option.label}</span>
                <span>{option.voteCount} {copy.votes}</span>
              </span>
              <span className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-200">
                <span className={`block h-full ${option.votedByMe ? "bg-[#0f766e]" : "bg-slate-400"}`} style={{ width: `${percent}%` }} />
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}
