import React from 'react';
import {
  Plus, CheckCircle2, Activity, AlertTriangle, ClipboardList,
  FileText, Users, MessageSquare, Paperclip, Timer,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';

export type ActivityVariant = 'tech' | 'admin';

export interface ActivityConfig {
  type: 'GREEN' | 'ORANGE' | 'BLUE' | 'PURPLE';
  icon: React.ComponentType<{ className?: string }>;
  tab: string;        // stabilny identyfikator zakładki ('all' | 'mine' | 'pool' | 'tickets' | 'team' | '_edits')
  text: React.ReactNode;
  unread: boolean;
}

/** Renderuje tekst z markerami <b>...</b> jako React z elementami <strong>. */
const renderBold = (str: string): React.ReactNode => {
  const parts = str.split(/(<b>.*?<\/b>)/g);
  return (
    <span>
      {parts.map((part, i) => {
        const m = part.match(/^<b>(.*?)<\/b>$/);
        if (m) return <strong key={i}>{m[1]}</strong>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
};

/** Względny czas aktywności, zlokalizowany. */
export const formatActivityTime = (dateStr: string, t: TFunction): string => {
  const date = dayjs(dateStr);
  const now = dayjs();
  const diffMinutes = now.diff(date, 'minute');
  const diffHours = now.diff(date, 'hour');

  if (diffMinutes < 60) return t('time.minAgo', { n: Math.max(1, diffMinutes) });
  if (diffHours < 24 && date.isSame(now, 'day')) return t('time.hoursAgo', { n: diffHours });
  if (date.isSame(now.subtract(1, 'day'), 'day')) return t('time.yesterday');

  const monthsShort = t('calendar.monthsShort', { returnObjects: true }) as string[];
  const days = t('time.weekdaysShort', { returnObjects: true }) as string[];
  return `${days[date.day()]}, ${date.date()} ${monthsShort[date.month()]}`;
};

/**
 * Buduje konfigurację wpisu aktywności (ikona, kolor, tekst, zakładka).
 * Wspólne dla pulpitu technika i admina — różnice w przypisaniu zakładek
 * sterowane parametrem `variant`.
 */
export const getActivityConfig = (
  log: any,
  t: TFunction,
  currentUserId: number | undefined,
  variant: ActivityVariant,
): ActivityConfig => {
  const action = log.action;
  const ticketId = log.ticket;
  const user = log.user_details;
  const userName = user ? `${user.first_name} ${user.last_name}` : t('activity.system');
  const isMe = user?.id === currentUserId;
  const bulk = log._bulkCount;

  const trunc = (s: string, max = 40) => (s.length > max ? s.slice(0, max) + '...' : s);
  const sl = (v: string) => (v ? t(`status.${v}`, v) : v);
  const pl = (v: string) => (v ? t(`priority.${v}`, v) : v);

  const ticketObj = bulk ? t('activity.bulkCount', { count: bulk }) : t('activity.ticketWord', { id: ticketId });

  // Wybiera szablon self/other i renderuje z pogrubieniem
  const make = (selfKey: string, otherKey: string, vars: Record<string, any> = {}) => {
    const key = isMe && user ? selfKey : otherKey;
    return renderBold(t(key, { actor: userName, object: ticketObj, ...vars }));
  };

  // Zespół vs Pula — etykiety zakładek różnią się między wariantami
  const teamTab = variant === 'tech' ? 'pool' : 'team';
  const ticketsTab = variant === 'tech' ? 'mine' : 'tickets';

  switch (action) {
    case 'CREATED':
      return { type: 'GREEN', icon: Plus, tab: ticketsTab, unread: true,
        text: make('activity.createdSelf', 'activity.createdOther') };

    case 'STATUS_CHANGED': {
      const oldS = log.old_value ? sl(log.old_value) : null;
      const newS = log.new_value ? sl(log.new_value) : null;
      const detail = bulk ? (newS ? ` → ${newS}` : '') : (oldS && newS ? `: ${oldS} → ${newS}` : newS ? ` → ${newS}` : '');
      const isResolved = ['ROZWIAZANE', 'ZAMKNIETE'].includes(log.new_value);
      return {
        type: isResolved ? 'GREEN' : 'ORANGE',
        icon: isResolved ? CheckCircle2 : Activity,
        tab: ticketsTab, unread: !isResolved,
        text: make('activity.statusSelf', 'activity.statusOther', { detail }),
      };
    }

    case 'PRIORITY_CHANGED': {
      const oldP = log.old_value ? pl(log.old_value) : null;
      const newP = log.new_value ? pl(log.new_value) : null;
      const detail = bulk ? (newP ? ` → ${newP}` : '') : (oldP && newP ? `: ${oldP} → ${newP}` : newP ? ` → ${newP}` : '');
      return { type: 'ORANGE', icon: AlertTriangle, tab: ticketsTab, unread: true,
        text: make('activity.prioritySelf', 'activity.priorityOther', { detail }) };
    }

    case 'CATEGORY_CHANGED': {
      const oldC = log.old_value || null;
      const newC = log.new_value || null;
      const detail = bulk ? (newC ? ` → ${newC}` : '') : (oldC && newC ? `: ${oldC} → ${newC}` : newC ? ` → ${newC}` : '');
      return { type: 'ORANGE', icon: ClipboardList, tab: ticketsTab, unread: false,
        text: make('activity.categorySelf', 'activity.categoryOther', { detail }) };
    }

    case 'TITLE_CHANGED': {
      const oldT = log.old_value ? `„${trunc(log.old_value)}"` : null;
      const newT = log.new_value ? `„${trunc(log.new_value)}"` : null;
      const detail = oldT && newT ? `: ${oldT} → ${newT}` : newT ? ` → ${newT}` : '';
      return { type: 'ORANGE', icon: FileText, tab: '_edits', unread: false,
        text: make('activity.titleSelf', 'activity.titleOther', { detail }) };
    }

    case 'DESCRIPTION_CHANGED':
      return { type: 'ORANGE', icon: FileText, tab: '_edits', unread: false,
        text: make('activity.descriptionSelf', 'activity.descriptionOther') };

    case 'REOPENED':
      return { type: 'ORANGE', icon: Activity, tab: ticketsTab, unread: true,
        text: make('activity.reopenedSelf', 'activity.reopenedOther') };

    case 'AUTO_CLOSED':
      return { type: 'GREEN', icon: CheckCircle2, tab: ticketsTab, unread: false,
        text: renderBold(t('activity.autoClosed', { object: ticketObj })) };

    case 'TECHNICIAN_ASSIGNED': {
      const tech = log.new_value || null;
      const detail = tech ? `: ${tech}` : '';
      return { type: 'BLUE', icon: Users, tab: teamTab, unread: false,
        text: make('activity.techAssignedSelf', 'activity.techAssignedOther', { detail }) };
    }

    case 'TECHNICIAN_REMOVED': {
      const tech = log.old_value || log.new_value || null;
      const detail = tech ? `: ${tech}` : '';
      return { type: 'BLUE', icon: Users, tab: teamTab, unread: false,
        text: make('activity.techRemovedSelf', 'activity.techRemovedOther', { detail }) };
    }

    case 'CREATOR_CHANGED':
      return { type: 'BLUE', icon: Users, tab: ticketsTab, unread: false,
        text: make('activity.creatorSelf', 'activity.creatorOther', { detail: log.new_value ? ` → ${log.new_value}` : '' }) };

    case 'COMMENT_ADDED':
      return {
        type: 'BLUE', icon: MessageSquare,
        tab: log.new_value === 'INTERNAL' ? teamTab : ticketsTab, unread: true,
        text: make('activity.commentSelf', 'activity.commentOther'),
      };

    case 'ATTACHMENT_ADDED': {
      const isMultiple = log.new_value && /^\d+ załącznik/.test(log.new_value);
      const what = isMultiple ? log.new_value : t('activity.attachmentSingular');
      const detail = !isMultiple && log.new_value ? `: ${log.new_value}` : '';
      return { type: 'PURPLE', icon: Paperclip, tab: ticketsTab, unread: false,
        text: make('activity.attachmentAddedSelf', 'activity.attachmentAddedOther', { what, detail }) };
    }

    case 'ATTACHMENT_DELETED':
      return { type: 'PURPLE', icon: Paperclip, tab: ticketsTab, unread: false,
        text: make('activity.attachmentDeletedSelf', 'activity.attachmentDeletedOther', { detail: log.old_value ? `: ${log.old_value}` : '' }) };

    case 'WORK_LOGGED':
      return { type: 'PURPLE', icon: Timer, tab: ticketsTab, unread: false,
        text: make('activity.workLoggedSelf', 'activity.workLoggedOther', { detail: log.new_value ? ` (${log.new_value})` : '' }) };

    default:
      return { type: 'ORANGE', icon: ClipboardList, tab: ticketsTab, unread: false,
        text: make('activity.defaultSelf', 'activity.defaultOther') };
  }
};
