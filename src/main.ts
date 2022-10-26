import { Address, BatchResult, CallParameter, CallResult, DeployResult, Micheline, MichelineType, OriginateResult, Tez, ViewResult } from "@completium/archetype-ts-types";
import { emitMicheline, MichelsonData, packDataBytes } from '@taquito/michel-codec';
import { Schema } from '@taquito/michelson-encoder';
import { OpKind, TezosToolkit, WalletParamsWithKind } from '@taquito/taquito';
import { encodeExpr } from '@taquito/utils';

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
  return { ...op, dummy: 0 }
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

function toMichelsonData(m: Micheline): MichelsonData {
  return (m as MichelsonData)
}

export const get_big_map_value = async (id: BigInt, data: Micheline, type_key: MichelineType, type_value: MichelineType): Promise<any> => {
  const d: MichelsonData = toMichelsonData(data);
  const input = packDataBytes(d, type_key).bytes;
  const expr = encodeExpr(input);

  return new Promise(async (resolve, reject) => {
    tezos?.rpc.getBigMapExpr(id.toString(), expr)
      .then(res => {
        const schema = new Schema(type_value);
        const data = schema.Execute(res);
        resolve(data)
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
  const c = await tezos?.contract.at(address.toString());
  if (c === undefined) {
    throw new Error(`Contract ${address.toString()} not found`);
  }
  const input = emitMicheline(arg);
  const a = c.contractViews[entry](input);
  const user_pkh = params.as ? params.as.toString() : 'tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb';
  const b = await a.executeView({ viewCaller: user_pkh })
  return {value: b, dummy: 0}
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
  return { ...op, dummy: 0 }
}

export const deploy = (path: string, parameters: any, params: any): Promise<DeployResult> => {
  throw new Error("@completium/dapp-ts: 'deploy' not implemented.")
}

export const originate = async (path: string, storage: Micheline, p: Partial<Parameters>): Promise<OriginateResult> => {
  throw new Error("@completium/dapp-ts: 'originate' not implemented.")
}