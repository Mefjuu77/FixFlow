import React from 'react';

interface UserAvatarProps {
  avatar?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-4 h-4', text: 'text-[9px]' },
  sm: { container: 'w-5 h-5', text: 'text-[10px]' },
  md: { container: 'w-6 h-6', text: 'text-[11px]' },
};

const UserAvatar: React.FC<UserAvatarProps> = ({ avatar, name, size = 'sm', className = '' }) => {
  const s = sizeMap[size];
  const initial = name?.charAt(0)?.toUpperCase() || 'U';

  if (avatar) {
    return (
      <div className={`${s.container} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${s.container} rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className={`${s.text} font-bold uppercase leading-none`}>{initial}</span>
    </div>
  );
};

export default React.memo(UserAvatar);
