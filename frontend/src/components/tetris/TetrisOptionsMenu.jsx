import { useState, useRef, useEffect } from "react";
import { MoreVertical, HelpCircle, RotateCcw, Settings, X, Minimize2, Pause, Play, LogOut, AlertCircle, Upload, BellRing } from "lucide-react";
import TetrisConfirmModal from "./TetrisConfirmModal";

export default function TetrisOptionsMenu({
  isFullscreen,
  gameStarted,
  gameOver,
  isPaused,
  isMobileViewport,
  headerState,
  onOpenSettings,
  onOpenHowToPlay,
  onOpenProfileUpdate,
  onOpenPlayerNotices,
  onReset,
  onToggleFullscreen,
  onTogglePause,
  onSignOut,
  unreadNoticeCount = 0,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpenSettings = () => {
    onOpenSettings();
    setIsOpen(false);
  };

  const handleOpenHowToPlay = () => {
    onOpenHowToPlay();
    setIsOpen(false);
  };

  const handleOpenProfileUpdate = () => {
    onOpenProfileUpdate?.();
    setIsOpen(false);
  };

  const handleOpenPlayerNotices = () => {
    onOpenPlayerNotices?.();
    setIsOpen(false);
  };

  const formattedUnreadNoticeCount = unreadNoticeCount > 99 ? "99+" : unreadNoticeCount;

  const handleReset = () => {
    setShowResetConfirm(true);
  };

   const handleToggleFullscreen = () => {
     onToggleFullscreen();
     setIsOpen(false);
   };

   const handleTogglePause = () => {
     onTogglePause();
     setIsOpen(false);
   };

   const handleSignOut = () => {
     setShowSignOutConfirm(true);
   };

   const handleConfirmReset = () => {
     onReset();
     setShowResetConfirm(false);
     setIsOpen(false);
   };

   const handleConfirmSignOut = () => {
     onSignOut();
     setShowSignOutConfirm(false);
     setIsOpen(false);
   };

   return (
     <>
       <div className={["tetris-options-menu-container", isOpen ? "is-open" : ""].filter(Boolean).join(" ")}>
         <button
           ref={buttonRef}
           type="button"
           className={["tetris-options-menu-button", isOpen ? "is-active" : ""].filter(Boolean).join(" ")}
           onClick={() => setIsOpen(!isOpen)}
           title="Game Options"
           aria-label="Game Options"
           aria-expanded={isOpen}
           aria-haspopup="menu"
           data-state={headerState || "default"}
         >
           {isOpen ? <X size={20} /> : <MoreVertical size={20} />}
            {unreadNoticeCount > 0 ? (
              <span className="tetris-options-menu-badge" aria-label={`${unreadNoticeCount} unread admin notification${unreadNoticeCount === 1 ? "" : "s"}`}>
                {formattedUnreadNoticeCount}
              </span>
            ) : null}
         </button>

         {isOpen && (
           <div
             ref={menuRef}
             className={["tetris-options-menu", isFullscreen ? "is-fullscreen" : ""].filter(Boolean).join(" ")}
             role="menu"
           >
             <button
               type="button"
               className="tetris-options-menu-item"
               onClick={handleOpenHowToPlay}
               role="menuitem"
             >
               <HelpCircle size={16} />
               <span>How to Play</span>
             </button>

             <button
               type="button"
               className="tetris-options-menu-item"
               onClick={handleOpenSettings}
               role="menuitem"
             >
               <Settings size={16} />
               <span>Settings</span>
             </button>

              <button
                type="button"
                className="tetris-options-menu-item"
                onClick={handleOpenPlayerNotices}
                role="menuitem"
              >
                <BellRing size={16} />
                <span>Notifications</span>
                {unreadNoticeCount > 0 ? <span className="tetris-options-menu-item-badge">{formattedUnreadNoticeCount}</span> : null}
              </button>

              <button
                type="button"
                className="tetris-options-menu-item"
                onClick={handleOpenProfileUpdate}
                role="menuitem"
              >
                <Upload size={16} />
                <span>Re-upload Profile Picture</span>
              </button>

              {(gameStarted && !gameOver) && (
                <button
                  type="button"
                  className="tetris-options-menu-item"
                  onClick={handleTogglePause}
                  role="menuitem"
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                  <span>{isPaused ? "Resume" : "Pause"}</span>
                </button>
              )}

              {(gameStarted || gameOver) && (
                <button
                  type="button"
                  className="tetris-options-menu-item is-danger"
                  onClick={handleReset}
                  role="menuitem"
                >
                  <RotateCcw size={16} />
                  <span>Reset Game</span>
                </button>
              )}

              {isFullscreen && (
                <button
                  type="button"
                  className="tetris-options-menu-item"
                  onClick={handleToggleFullscreen}
                  role="menuitem"
                >
                  <Minimize2 size={16} />
                  <span>Exit Fullscreen</span>
                </button>
              )}

              <button
                type="button"
                className="tetris-options-menu-item is-danger"
                onClick={handleSignOut}
                role="menuitem"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
         )}
       </div>

       <TetrisConfirmModal
         isVisible={showResetConfirm}
         title="Reset Game?"
         message="Are you sure you want to reset the game? Your progress will be lost."
         confirmText="Reset"
         cancelText="Cancel"
         isDanger={true}
         icon={RotateCcw}
         onConfirm={handleConfirmReset}
         onCancel={() => setShowResetConfirm(false)}
       />

       <TetrisConfirmModal
         isVisible={showSignOutConfirm}
         title="Sign Out?"
         message="Are you sure you want to sign out? You'll need to log in again to play."
         confirmText="Sign Out"
         cancelText="Cancel"
         isDanger={true}
         icon={AlertCircle}
         onConfirm={handleConfirmSignOut}
         onCancel={() => setShowSignOutConfirm(false)}
       />
     </>
   );
}

