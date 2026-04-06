// Candid IDL for volta_backend canister (xswq7-nqaaa-aaaai-q75vq-cai)
// Copied from volta_frontend/src/declarations/volta_backend/volta_backend.did.js

export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    createNote: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    getAndBurnNote: IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Nat8))], []),
    ping: IDL.Func([], [IDL.Text], []),
  });
};

export const init = ({ IDL }) => {
  return [];
};
