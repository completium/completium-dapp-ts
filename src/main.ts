import { Address, ArchetypeTypeArg, BatchResult, Bytes, CallParameter, CallResult, DeployResult, Micheline, MichelineType, OriginateResult, Tez, ViewResult } from "@completium/archetype-ts-types";
import { emitMicheline, MichelsonData, MichelsonType, packDataBytes } from '@taquito/michel-codec';
import { Schema } from '@taquito/michelson-encoder';
import { OpKind, TezosToolkit, WalletOriginateParams, WalletParamsWithKind } from '@taquito/taquito';
import { buf2hex, encodeExpr, hex2buf } from "@taquito/utils";
import * as blakejs from 'blakejs';

// global toolkit
let tezos: TezosToolkit | undefined = undefined

export const set_binder_tezos_toolkit = (ttk: TezosToolkit) => {
  tezos = ttk
}

export interface Parameters {
  amount?: Tez
  fee?: Tez
  as?: Address
}

export const get_call_param = async (addr: string, entry: string, arg: Micheline, p: Parameters): Promise<CallParameter> => {
  return {
    destination: new Address(addr),
    amount: new Tez(p.amount ? p.amount.toString() : 0, "mutez"),
    fee: p.fee ? new Tez(p.fee.toString(), "mutez") : undefined,
    entrypoint: entry,
    arg: arg
  }
}

export const call = async (addr: string, name: string, arg: Micheline, p: Parameters): Promise<CallResult> => {
  const amount = p.amount === undefined ? 0 : p.amount.to_big_number().toNumber();
  const fee = p.fee === undefined ? 0 : p.fee.to_big_number().toNumber()

  const transferParam = { to: addr, amount: amount, fee: fee > 0 ? fee : undefined, mutez: true, parameter: { entrypoint: name, value: arg } };

  const op = await tezos?.wallet.transfer(transferParam).send();
  await op?.confirmation(1);
  return {
    ...op,
    operation_hash: op?.opHash ?? "",
    storage_size: 0,
    consumed_gas: 0,
    paid_storage_size_diff: 0,
    events: []
  }
}

export const get_balance = async (addr: Address): Promise<Tez> => {
  const res = await tezos?.tz.getBalance(addr.toString());
  if (res === undefined) {
    throw new Error("Error: get_balance");
  }
  return new Tez(res, "mutez")
}

export const get_storage = async (addr: string): Promise<any> => {
  return tezos?.contract.at(addr).then(async contract => {
    return await contract.storage()
  })
}

export const get_raw_storage = async (addr: string): Promise<Micheline> => {
  const x = await tezos?.rpc.getStorage(addr);
  return (x as Micheline)
}

function toMichelsonData(m: Micheline): MichelsonData {
  return (m as MichelsonData)
}

export const get_big_map_value = async (id: BigInt, data: Micheline, type_key: MichelineType, type_value?: MichelineType): Promise<any> => {
  const d: MichelsonData = toMichelsonData(data);
  const input = packDataBytes(d, (type_key as MichelsonType)).bytes;
  const expr = encodeExpr(input);

  return new Promise(async (resolve, reject) => {
    tezos?.rpc.getBigMapExpr(id.toString(), expr)
      .then(res => {
        if (type_value) {
          const schema = new Schema(type_value);
          const data = schema.Execute(res);
          resolve(data)
        } else {
          resolve(res)
        }
      })
      .catch(x => {
        if (x.status == 404) {
          resolve(undefined)
        } else {
          reject(x)
        }
      })
  });
}

export const exec_view = async (address: Address, entry: string, arg: Micheline, params: Parameters): Promise<ViewResult> => {
  const chain_id = await tezos?.rpc.getChainId();

  if (!chain_id) {
    throw new Error("exec_view: cannot fetch chain_id")
  }
  const res = await tezos?.rpc.runScriptView({
    contract: address.toString(),
    view: entry,
    input: arg,
    chain_id: chain_id,
    payer: params.as?.toString(),
    source: params.as?.toString()
  });
  return { value: res?.data, dummy: 0 }
}

export const exec_batch = async (callParameters: CallParameter[]): Promise<BatchResult> => {
  const paramsWithKinds: WalletParamsWithKind[] = callParameters.map(x => {
    return {
      kind: OpKind.TRANSACTION,
      to: x.destination.toString(),
      amount: x.amount.to_big_number().toNumber(),
      fee: x.fee ? x.fee.to_big_number().toNumber() : undefined,
      parameter: {
        entrypoint: x.entrypoint,
        value: toMichelsonData(x.arg)
      },
      mutez: true
    }
  });
  const batch = tezos?.wallet.batch(paramsWithKinds);
  if (batch === undefined) {
    throw new Error("Error: Invalid batch");
  }

  const op = await batch.send();
  await op?.confirmation(1);
  return { ...op, events: [], dummy: 0 }
}

export const pack = (obj: Micheline, typ?: MichelineType): Bytes => {
  return new Bytes(packDataBytes((obj as MichelsonData), (typ as MichelsonType)).bytes);
}

export const blake2b = (b: Bytes): Bytes => {
  const blakeHash = blakejs.blake2b(hex2buf(b.toString()), undefined, 32);
  const res = buf2hex((blakeHash.buffer as Buffer));
  return new Bytes(res)
}

export const deploy = (path: string, parameters: any, params: any): Promise<DeployResult> => {
  throw new Error("@completium/dapp-ts: 'deploy' not implemented.")
}

export const originate = async (code: Micheline, storage: Micheline, p: Parameters): Promise<DeployResult> => {
  const amount = p.amount === undefined ? 0 : p.amount.to_big_number().toNumber();
  const fee = p.fee === undefined ? 0 : p.fee.to_big_number().toNumber()

  const originateParam: WalletOriginateParams = {
    code: (code as object[]),
    init: storage,
    balance: amount,
    fee: fee > 0 ? fee : undefined,
    mutez: true,
  };

  const op = await tezos?.wallet.originate(originateParam).send();
  const c = await op?.originationOperation();
  const contracts = c?.metadata.operation_result.originated_contracts;
  if (contracts) {
    const address = contracts[0];
    await op?.confirmation(1);
    return {
      ...op,
      address: address
    }
  } else {
    throw ("Adress not found")
  }
}

export const deploy_from_json = async (name: string, code: any, storage: Micheline, p: Partial<Parameters>): Promise<DeployResult> => {
  throw new Error("@completium/dapp-ts: 'deploy_from_json' not implemented.")
}

export const deploy_callback = async (name: string, mt: MichelineType, p: Partial<Parameters>): Promise<DeployResult> => {
  throw new Error("@completium/dapp-ts: 'deploy_callback' not implemented.")
}

export const get_callback_value = async <T extends ArchetypeTypeArg>(callback_addr: string, mich_to: (_: any) => T): Promise<T> => {
  throw new Error("@completium/dapp-ts: 'get_callback_value' not implemented.")
}
