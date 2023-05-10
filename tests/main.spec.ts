import { Address, Bytes, CallParameter, Micheline, MichelineType } from '@completium/archetype-ts-types';
import { Context, LegacyWalletProvider, Protocols, TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { blake2b, call, exec_batch, exec_getter, exec_view, get_balance, get_big_map_value, get_call_param, get_raw_storage, get_storage, originate, pack, set_binder_tezos_toolkit } from '../src';

const assert = require('assert');

const endpoint = 'https://ghostnet.smartpy.io';
const address = 'KT1VR4Rc3ovru3ogpaRu9qtubNLiHQUq54c6';
const signer = new InMemorySigner('edskRgfNYuKgoMLobBPBh5GoSXxdnzjsqqTymQRoAALCzz94zxq5DR9h41NmFZkCWAzWZ9NdweXv8BD6hKEJmK9UYWcxK4pnct')
const context: Context = new Context(endpoint, signer, Protocols.PtLimaPtL)
const tezos: TezosToolkit = new TezosToolkit(endpoint);
const big_map_id = 225028

describe('DApp', () => {
  it('init', () => {
    tezos.setWalletProvider(new LegacyWalletProvider(context));
    set_binder_tezos_toolkit(tezos);
  })

  it('originate', async () => {
    const code: Micheline = [
      {
        "prim": "storage",
        "args": [
          { "prim": "nat" }
        ]
      },
      {
        "prim": "parameter",
        "args": [
          { "prim": "unit" }
        ]
      },
      {
        "prim": "code",
        "args": [
          [ { "prim": "CDR" },
          {
            "prim": "NIL",
            "args": [
              { "prim": "operation" }
            ]
          },
          { "prim": "PAIR" }]
        ]
      }];
    const res = await originate(code, { int: "0" }, {});
  })

  it('call', async () => {
    await call(address, "set_n", { int: "0" }, {})
  })

  it('get_call_param & exec batch', async () => {
    const c1: CallParameter = await get_call_param(address, "set_n", { int: "0" }, {});
    const c2: CallParameter = await get_call_param(address, "size", { string: "" }, {});
    await exec_batch([c1, c2]);
  })

  it('exec_view', async () => {
    const res = await exec_view(new Address(address), "get_n", { prim: "Unit" }, {});
    assert(JSON.stringify(res.value) == `{"int":"0"}`, "Invalid value")
  })

  it('exec_getter', async () => {
    const res = await exec_getter(new Address(address), "tzip4_get_n", { prim: "Unit" }, {});
    assert(JSON.stringify(res.value) == `{"int":"0"}`, "Invalid value")
  })

  it('get_storage', async () => {
    const storage = await get_storage(address.toString());
    // console.log(storage);
    assert(storage.n.toNumber() == 0, "Invalid value")
  })

  it('get_balance', async () => {
    const balance = await get_balance(new Address(address));
    // console.log(`balance: ${balance}`);
    assert(balance.to_big_number().toNumber() == 0, "Invalid value")
  })

  it('get_raw_storage', async () => {
    const res = await get_raw_storage(address);
    assert(JSON.stringify(res, null, 0) == `{"prim":"Pair","args":[{"int":"0"},{"int":"${big_map_id}"}]}`, "Invalid value")
  })

  it('get_big_map_value', async () => {
    const value = await get_big_map_value(BigInt(big_map_id), { int: "2" }, { prim: "nat", annots: [] });
    assert(JSON.stringify(value) == `{"string":"mystr"}`);
  })

  it('get_big_map_value with value', async () => {
    const value = await get_big_map_value(BigInt(big_map_id), { int: "2" }, { prim: "nat", annots: [] }, { prim: "string", annots: [] });
    // console.log(`value: ${value}`);
    assert(value == "mystr", "Invalid value")
  })

  it('get_big_map_value with key not found', async () => {
    const value = await get_big_map_value(BigInt(big_map_id), { int: "3" }, { prim: "nat", annots: [] }, { prim: "string", annots: [] });
    // console.log(`value: ${value}`);
    assert(value === undefined, "Invalid value")
  })

  it('pack', async () => {
    const data = { int: "2" };
    const ty: MichelineType = { prim: "nat", annots: [] };
    const value = pack(data, ty);
    assert(value.toString() === "050002", "Invalid value")
  })

  it('blake2b', async () => {
    const data = new Bytes("050002");
    const value = blake2b(data);
    assert(value.toString() === "5d2525095b5382da2c9c295a739a189382cfaa2ebfa54e320d15bc6f178d6820", "Invalid value")
  })

})

// describe('Test', () => {
//   it('init', () => {
//     tezos.setWalletProvider(new LegacyWalletProvider(context));
//     set_binder_tezos_toolkit(tezos);
//   })

//   it('exec_view', async () => {
//     const res = await exec_view(new Address("KT1FcUNmyZ255yyfqWL3GC1AGqSY2vKqYwEg"), "already_responded", { int: "1" }, { as: new Address("tz1Lc2qBKEWCBeDU8npG6zCeCqpmaegRi6Jg") });
//     console.log(JSON.stringify(res.value))
//   })
// })
