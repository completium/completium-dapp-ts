import { Address, CallParameter } from '@completium/archetype-ts-types';
import { TezosToolkit } from '@taquito/taquito';
import { call, exec_batch, exec_view, get_balance, get_big_map_value, get_call_param, get_storage, set_binder_tezos_toolkit } from '../src';

const assert = require('assert');

const endpoint = 'https://kathmandunet.ecadinfra.com';
const address = 'KT1S2Vya2BvDGyQZRUe4d6zashzBNnN5iwh1';
const tezos : TezosToolkit = new TezosToolkit(endpoint);

describe('DApp', () => {
  it ('init', () => {
    // tezos.setWalletProvider();
    set_binder_tezos_toolkit(tezos);
  })

  it('call', async () => {
    await call(address, "set_n", {int: "0"}, {})
  })

  it('get_call_param & exec batch', async () => {
    const c1 : CallParameter = await get_call_param(address, "set_n", {int: "0"}, {});
    const c2 : CallParameter = await get_call_param(address, "size", {string: ""}, {});
    await exec_batch([c1, c2]);
  })

  it('exec_view', async () => {
    const res = await exec_view(new Address(address), "", {prim: "Unit"}, {});
    // console.log(`exec_view: ${res}`);
    assert(res.toNumber() == 0, "Invalid value")
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

  it('get_big_map_value', async () => {
    const value = await get_big_map_value(BigInt(80870), {int: "2"}, {prim: "nat", annots: []}, {prim: "string", annots: []});
    // console.log(`value: ${value}`);
    assert(value == "mystr", "Invalid value")
  })

})
