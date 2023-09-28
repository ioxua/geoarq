import kmeans from 'node-kmeans'
import { Client } from '@elastic/elasticsearch'
import { readFileSync } from 'fs'
import { createIndexIfNotExists } from './utils'

// We're using kmeans, so we'll guess a random number of
// centroids for each zoom level hehe

const config = {
    index: 'geoarq-demo',
    zoomIndex: 'geoarq-demo-clusterized',
    levels: [
        { name: 'City', clusters: 500 },
        { name: 'State', clusters: 50 },
        { name: 'Country', clusters: 5 },
    ]
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

async function run() {
    await createIndexIfNotExists(config.zoomIndex, client)
  
    await client.indices.putMapping({
      index: config.zoomIndex,
      properties: {
        // elementIds: { type: 'text-array' },
        size: { type: 'integer' },
        name: { type: 'text' },
        position: { type: 'geo_point' },
      }
    })

    const data: any[] = await client.helpers.search({
        index: config.index,
        size: 500,
    })
    
    const vectors = []
    for (let i = 0 ; i < data.length ; i++) {
        vectors[i] = [ data[i].position.lat , data[i].position.lon ];
    }
    
    for (const { clusters, name } of config.levels) {
        kmeans.clusterize(vectors, {k: clusters}, (err, res) => {
            if (err || !res) {
                console.error(err);
                return
            }

            console.log(res.length)
            const clusterizedPoints: any[] = []
            for (let i = 0; i < res.length; i++) {
                const cData = res[i]
                // console.log('cdata', cData)
                // console.log(clusterizedPoints)
                clusterizedPoints.push({
                    name: `${name}-${i}`,
                    position: {
                        lat: cData.centroid[0],
                        lon: cData.centroid[1],
                    },
                    size: cData.clusterInd.length,
                    elementIds: cData.clusterInd.map(idx => data[idx].title) 
                })
                // console.log('clusterizedPoints', clusterizedPoints)

            }

            console.log(clusterizedPoints)
            client.helpers.bulk({
                index: config.zoomIndex,
                datasource: clusterizedPoints,
                // @ts-ignore
                onDocument(doc) {
                return {
                    create: { _index: config.zoomIndex, _id: doc.name },
                }
                }
            })
        });
    }

}

run()
