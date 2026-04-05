import React from 'react';
import TeamFilterBar from '../common/TeamFilterBar';

interface Props {
  selectedTeamId: string;
  onSelect: (teamId: string) => void;
  myTeamId?: string | null;
}

export default function TeamTabBar({ selectedTeamId, onSelect, myTeamId }: Props) {
  return (
    <TeamFilterBar
      selectedTeamId={selectedTeamId === 'all' ? null : selectedTeamId}
      onSelect={(id) => onSelect(id ?? 'all')}
      showAll
      myTeamId={myTeamId}
    />
  );
}
