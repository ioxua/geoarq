import { Client } from '@elastic/elasticsearch'
import { faker } from '@faker-js/faker';
import { readFileSync } from 'fs'
import { createIndexIfNotExists } from './utils'

const config = {
  index: 'geoarq-demo',
  totalLoad: 100_000,
  fakeData: {
    allKinds: ['Type A', 'Type B']
  }
}

const client = new Client({
  node: `https://localhost:${process.env.ES_PORT ?? '1234'}`,
  auth: {
    username: process.env.ELASTIC_USERNAME ?? '',
    password: process.env.ELASTIC_PASSWORD ?? '',
  },
  tls: {
    ca: readFileSync( "./certs/ca.crt" ),
  }
})

function randomPoint() {
  return {
    dataKind: faker.helpers.arrayElement(config.fakeData.allKinds),
    title: faker.company.name(),
    destructive: faker.company.catchPhrase(),
    position: {
      lat: faker.location.latitude({
        min: -33.69111, max: 2.81972, precision: 5,
      }),
      lon: faker.location.latitude({
        min: -72.89583, max: -34.80861, precision: 5,
      }),
    }
  }
}

async function run() {
  await createIndexIfNotExists(config.index, client)

  await client.indices.putMapping({
    index: config.index,
    properties: {
      dataKind: { type: 'keyword' },
      title: { type: 'text' },
      description: { type: 'text' },
      position: { type: 'geo_point' },
    }
  })

  let points = []
  for (let i = 0; i < config.totalLoad; i++) {
    points.push(randomPoint())
  }

  await client.helpers.bulk({
    index: config.index,
    datasource: points,
    // @ts-ignore
    onDocument(doc) {
      return {
        create: { _index: config.index, _id: doc.title },
      }
    }
  })

}

run()