import { useState, useEffect, useCallback, useRef } from 'react';
import { FiShieldOff } from 'react-icons/fi';

import CommunityLayout from '../components/community/CommunityLayout';
import ReportModal from '../components/community/ReportModal';

import { getSocket } from '../utils/socket';

import '../css/Community.css';

export default function CommunityPage({ user, token }) {

  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [unreads, setUnreads] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);

  const [replyingTo, setReplyingTo] = useState(null);
  const [reportingMessage, setReportingMessage] = useState(null);

  const [connectionStatus, setConnectionStatus] =
    useState('connected');

  /* =========================================================
     REFS
  ========================================================= */

  const socketRef = useRef(null);
  const activeChannelRef = useRef(activeChannelId);

  activeChannelRef.current = activeChannelId;

  const isAuthenticated = Boolean(token && user);

  const isStudentVerified = user
    ? user.isVerified !== false
    : true;

  const currentUserId = user?._id || user?.userId;

  const apiBase =
    import.meta.env.VITE_API_BASE_URL || '';

  /* =========================================================
     FETCH COMMUNITY CHANNELS
  ========================================================= */

  useEffect(() => {
    let isMounted = true;

    const fetchChannels = async () => {
      try {
        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {};

        const res = await fetch(
          `${apiBase}/api/community/channels`,
          {
            headers,
          }
        );

        const data = await res.json();

        if (
          res.ok &&
          data.success &&
          isMounted
        ) {
          const fetchedChannels =
            Array.isArray(data.channels)
              ? data.channels
              : [];

          setChannels(fetchedChannels);

          /*
           * Automatically select first channel.
           * Functional state prevents stale activeChannelId.
           */

          if (fetchedChannels.length > 0) {
            setActiveChannelId((current) => {
              return current || fetchedChannels[0]._id;
            });
          }
        }
      } catch (err) {
        console.error(
          'Error fetching community channels:',
          err
        );
      }
    };

    fetchChannels();

    return () => {
      isMounted = false;
    };
  }, [token, apiBase]);


  useEffect(() => {
    if (!token) return;

    const socket = getSocket(
      token,
      (status) => {
        setConnectionStatus(status);
      }
    );
    socketRef.current = socket;

    if (!socket) return;

    /* ---------------------------------------------------------
       RECEIVE MESSAGE
    --------------------------------------------------------- */

    const handleReceive = (newMsg) => {
      const msgChannel = (newMsg.channelId || newMsg.channel || '').toString().toLowerCase();
      const activeCh = (activeChannelRef.current || '').toString().toLowerCase();

      if (msgChannel === activeCh) {
        setMessages((prev) => {
          if (
            prev.some(
              (message) =>
                message._id === newMsg._id
            )
          ) {
            return prev;
          }

          return [...prev, newMsg];
        });
      } else {
        setUnreads((prev) => ({
          ...prev,
          [msgChannel]:
            (prev[msgChannel] || 0) + 1,
        }));
      }
    };

    /* ---------------------------------------------------------
       UPDATE MESSAGE
    --------------------------------------------------------- */

    const handleUpdate = (updatedMsg) => {
      setMessages((prev) =>
        prev.map((message) =>
          message._id === updatedMsg._id
            ? updatedMsg
            : message
        )
      );
    };

    /* ---------------------------------------------------------
       DELETE MESSAGE
    --------------------------------------------------------- */

    const handleDelete = ({
      messageId,
    }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId
            ? {
                ...message,
                isDeleted: true,
                content:
                  'This message was deleted.',
              }
            : message
        )
      );
    };

    /* ---------------------------------------------------------
       REACTION
    --------------------------------------------------------- */

    const handleReact = (updatedMsg) => {
      setMessages((prev) =>
        prev.map((message) =>
          message._id === updatedMsg._id
            ? updatedMsg
            : message
        )
      );
    };

    /* ---------------------------------------------------------
       TYPING START
    --------------------------------------------------------- */

    const handleTypingStart = ({
      channelId,
      fullName,
      userId,
    }) => {
      if (
        channelId ===
          activeChannelRef.current &&
        userId !== currentUserId
      ) {
        setTypingUsers((prev) => {
          const name =
            fullName || 'Someone';

          if (prev.includes(name)) {
            return prev;
          }

          return [...prev, name];
        });
      }
    };

    /* ---------------------------------------------------------
       TYPING STOP
    --------------------------------------------------------- */

    const handleTypingStop = ({
      channelId,
    }) => {
      if (
        channelId ===
        activeChannelRef.current
      ) {
        setTypingUsers([]);
      }
    };

    /* ---------------------------------------------------------
       REGISTER SOCKET EVENTS
    --------------------------------------------------------- */

    socket.on(
      'message:receive',
      handleReceive
    );

    socket.on(
      'message:update',
      handleUpdate
    );

    socket.on(
      'message:delete',
      handleDelete
    );

    socket.on(
      'message:react',
      handleReact
    );

    socket.on(
      'typing:start',
      handleTypingStart
    );

    socket.on(
      'typing:stop',
      handleTypingStop
    );

    /* ---------------------------------------------------------
       CLEANUP
    --------------------------------------------------------- */

    return () => {
      socket.off(
        'message:receive',
        handleReceive
      );

      socket.off(
        'message:update',
        handleUpdate
      );

      socket.off(
        'message:delete',
        handleDelete
      );

      socket.off(
        'message:react',
        handleReact
      );

      socket.off(
        'typing:start',
        handleTypingStart
      );

      socket.off(
        'typing:stop',
        handleTypingStop
      );
    };
  }, [token, currentUserId]);

  /* =========================================================
     LOAD ACTIVE CHANNEL MESSAGES
  ========================================================= */

  useEffect(() => {
    if (!activeChannelId) return;

    let isMounted = true;

    /*
     * Clear unread count
     */

    setUnreads((prev) => ({
      ...prev,
      [activeChannelId]: 0,
    }));

    /*
     * Clear typing users
     */

    setTypingUsers([]);

    /*
     * Cancel reply when changing channel
     */

    setReplyingTo(null);

    /*
     * Join socket room
     */

    if (socketRef.current) {
      socketRef.current.emit(
        'community:join',
        {
          channelId: activeChannelId,
        }
      );
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);

      try {
        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {};

        const res = await fetch(
          `${apiBase}/api/community/channels/${activeChannelId}/messages`,
          {
            headers,
          }
        );

        const data = await res.json();

        if (
          res.ok &&
          data.success &&
          isMounted
        ) {
          setMessages(
            Array.isArray(data.messages)
              ? data.messages
              : []
          );
        }
      } catch (err) {
        console.error(
          'Error fetching channel messages:',
          err
        );
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    fetchMessages();

    /*
     * Cleanup channel
     */

    return () => {
      isMounted = false;

      if (socketRef.current) {
        socketRef.current.emit(
          'community:leave',
          {
            channelId: activeChannelId,
          }
        );
      }
    };
  }, [
    activeChannelId,
    token,
    apiBase,
  ]);

  /* =========================================================
     SELECT CHANNEL
  ========================================================= */

  const handleSelectChannel = useCallback(
    (channelId) => {
      if (!channelId) return;

      setActiveChannelId(channelId);
    },
    []
  );

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  const handleSendMessage = async ({
    content,
    replyTo,
  }) => {
    if (!activeChannelId) return;

    if (!content?.trim()) return;

    try {
      const res = await fetch(
        `${apiBase}/api/community/channels/${activeChannelId}/messages`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            content: content.trim(),
            replyTo: replyTo || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.message ||
            'Failed to send message.'
        );

        return;
      }

      /*
       * Normally Socket.IO will deliver
       * the newly-created message.
       */

    } catch (err) {
      console.error(
        'Error sending message:',
        err
      );

      alert(
        'Unable to send message. Please try again.'
      );
    }
  };

  /* =========================================================
     EDIT MESSAGE
  ========================================================= */

  const handleEditMessage = async (
    messageId,
    newContent
  ) => {
    if (!messageId) return;

    if (!newContent?.trim()) return;

    try {
      const res = await fetch(
        `${apiBase}/api/community/messages/${messageId}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            content:
              newContent.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.message ||
            'Failed to edit message.'
        );
      }
    } catch (err) {
      console.error(
        'Error editing message:',
        err
      );
    }
  };

  /* =========================================================
     DELETE MESSAGE
  ========================================================= */

  const handleDeleteMessage = async (
    messageId
  ) => {
    if (!messageId) return;

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this message?'
      );

    if (!confirmed) return;

    try {
      const res = await fetch(
        `${apiBase}/api/community/messages/${messageId}`,
        {
          method: 'DELETE',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.message ||
            'Failed to delete message.'
        );
      }
    } catch (err) {
      console.error(
        'Error deleting message:',
        err
      );
    }
  };

  /* =========================================================
     REACT TO MESSAGE
  ========================================================= */

  const handleReactMessage = async (
    messageId,
    emoji
  ) => {
    if (!messageId || !emoji) return;

    try {
      const res = await fetch(
        `${apiBase}/api/community/messages/${messageId}/react`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            emoji,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.message ||
            'Failed to react to message.'
        );
      }
    } catch (err) {
      console.error(
        'Error reacting to message:',
        err
      );
    }
  };

  /* =========================================================
     REPORT MESSAGE
  ========================================================= */

  const handleReportSubmit = async ({
    reason,
    description,
  }) => {
    if (!reportingMessage) return;

    try {
      const res = await fetch(
        `${apiBase}/api/community/messages/${reportingMessage._id}/report`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            reason,
            description,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert(
          'Thank you. The message has been reported to hostel administration for review.'
        );
      } else {
        alert(
          data.message ||
            'Failed to submit report.'
        );
      }
    } catch (err) {
      console.error(
        'Error submitting report:',
        err
      );

      alert(
        'Unable to submit report. Please try again.'
      );
    } finally {
      setReportingMessage(null);
    }
  };

  /* =========================================================
     TYPING START
  ========================================================= */

  const handleTypingStart = useCallback(() => {
    if (
      socketRef.current &&
      activeChannelId
    ) {
      socketRef.current.emit(
        'typing:start',
        {
          channelId:
            activeChannelId,
        }
      );
    }
  }, [activeChannelId]);

  /* =========================================================
     TYPING STOP
  ========================================================= */

  const handleTypingStop = useCallback(() => {
    if (
      socketRef.current &&
      activeChannelId
    ) {
      socketRef.current.emit(
        'typing:stop',
        {
          channelId:
            activeChannelId,
        }
      );
    }
  }, [activeChannelId]);

  /* =========================================================
     VERIFICATION SCREEN
  ========================================================= */

  if (!isStudentVerified) {
    return (
      <div
        className="community-page verification-page"
      >
        <div className="verification-card glass-card">

          <FiShieldOff className="verification-icon" />

          <h2>
            Verification Pending
          </h2>

          <p>
            Hostel Community access is
            reserved for verified resident
            students. Please complete your
            document submission under{' '}
            <strong>Uploads</strong> or
            contact hostel administration
            for verification.
          </p>

        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN COMMUNITY
  ========================================================= */

  return (
    <>
      <CommunityLayout
        /* Channels */
        channels={channels}
        activeChannelId={
          activeChannelId
        }
        onSelectChannel={
          handleSelectChannel
        }
        unreads={unreads}

        /* Messages */
        messages={messages}
        loading={loadingMessages}

        /* User */
        currentUser={user}

        /* Socket */
        connectionStatus={
          connectionStatus
        }

        /* Typing */
        typingUsers={
          typingUsers
        }

        /* Reply */
        replyingTo={
          replyingTo
        }
        onCancelReply={() =>
          setReplyingTo(null)
        }

        /* Send */
        onSendMessage={
          handleSendMessage
        }

        /* Typing */
        onTypingStart={
          handleTypingStart
        }
        onTypingStop={
          handleTypingStop
        }

        /* Reply */
        onReply={(message) =>
          setReplyingTo(message)
        }

        /* Reaction */
        onReact={
          handleReactMessage
        }

        /* Edit */
        onEdit={
          handleEditMessage
        }

        /* Delete */
        onDelete={
          handleDeleteMessage
        }

        /* Report */
        onReport={(message) =>
          setReportingMessage(
            message
          )
        }

        /* Authentication */
        isAuthenticated={
          isAuthenticated
        }
      />

      {reportingMessage && (
        <ReportModal
          message={
            reportingMessage
          }
          onClose={() =>
            setReportingMessage(
              null
            )
          }
          onSubmit={
            handleReportSubmit
          }
        />
      )}
    </>
  );
}