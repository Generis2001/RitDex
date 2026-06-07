export const ERC20_ABI = [
  { name: 'balanceOf',  type: 'function', stateMutability: 'view',       inputs: [{ name: 'a', type: 'address' }],                                     outputs: [{ type: 'uint256' }] },
  { name: 'allowance',  type: 'function', stateMutability: 'view',       inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }],      outputs: [{ type: 'uint256' }] },
  { name: 'approve',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }],      outputs: [{ type: 'bool' }] },
  { name: 'mint',       type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'event', name: 'Transfer', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
] as const;

export const RITPOOL_ABI = [
  { name: 'deposit',      type: 'function', stateMutability: 'payable',    inputs: [],                                          outputs: [{ name: 'sharesIssued', type: 'uint256' }] },
  { name: 'withdraw',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'shareAmount', type: 'uint256' }],  outputs: [{ name: 'ritualOut', type: 'uint256' }] },
  { name: 'getUserInfo',  type: 'function', stateMutability: 'view',       inputs: [{ name: 'user', type: 'address' }],         outputs: [{ name: 'userShares', type: 'uint256' }, { name: 'ritualValue', type: 'uint256' }] },
  { name: 'totalShares',  type: 'function', stateMutability: 'view',       inputs: [],                                          outputs: [{ type: 'uint256' }] },
  { name: 'totalRitual',  type: 'function', stateMutability: 'view',       inputs: [],                                          outputs: [{ type: 'uint256' }] },
  { type: 'event', name: 'Deposited', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'ritualAmount', type: 'uint256', indexed: false }, { name: 'sharesIssued', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Withdrawn', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'ritualAmount', type: 'uint256', indexed: false }, { name: 'sharesBurned', type: 'uint256', indexed: false }] },
] as const;

export const RITSTAKE_ABI = [
  { name: 'stake',             type: 'function', stateMutability: 'payable',    inputs: [],                                         outputs: [] },
  { name: 'unstake',           type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }],       outputs: [] },
  { name: 'claimReward',       type: 'function', stateMutability: 'nonpayable', inputs: [],                                         outputs: [] },
  { name: 'getStakeInfo',      type: 'function', stateMutability: 'view',       inputs: [{ name: 'userAddr', type: 'address' }],     outputs: [{ name: 'amount', type: 'uint256' }, { name: 'pending', type: 'uint256' }] },
  { name: 'rewardRatePerBlock',type: 'function', stateMutability: 'view',       inputs: [],                                         outputs: [{ type: 'uint256' }] },
  { type: 'event', name: 'Staked',        inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Unstaked',      inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'reward', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardClaimed', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'reward', type: 'uint256', indexed: false }] },
] as const;

export const RITBRIDGE_ABI = [
  { name: 'lock',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'destChainId', type: 'uint256' }, { name: 'recipient', type: 'address' }], outputs: [{ name: 'lockId', type: 'bytes32' }] },
  { name: 'release', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'claimId', type: 'bytes32' }, { name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'sig', type: 'bytes' }], outputs: [] },
  { name: 'released', type: 'function', stateMutability: 'view',      inputs: [{ name: 'claimId', type: 'bytes32' }],  outputs: [{ type: 'bool' }] },
  { type: 'event', name: 'Locked',   inputs: [{ name: 'lockId', type: 'bytes32', indexed: true }, { name: 'sender', type: 'address', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'destChainId', type: 'uint256', indexed: false }, { name: 'nonce', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Released', inputs: [{ name: 'claimId', type: 'bytes32', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
] as const;

export const WRAPPED_RITUAL_ABI = [
  { name: 'balanceOf',  type: 'function', stateMutability: 'view',       inputs: [{ name: 'a', type: 'address' }],  outputs: [{ type: 'uint256' }] },
  { name: 'claim',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'lockId', type: 'bytes32' }, { name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'sig', type: 'bytes' }], outputs: [] },
  { name: 'burn',       type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'ritualChainRecipient', type: 'address' }], outputs: [{ name: 'burnId', type: 'bytes32' }] },
  { name: 'claimed',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'lockId', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { type: 'event', name: 'Claimed',         inputs: [{ name: 'lockId', type: 'bytes32', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'BurnedForBridge', inputs: [{ name: 'burnId', type: 'bytes32', indexed: true }, { name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'ritualChainRecipient', type: 'address', indexed: false }] },
] as const;

