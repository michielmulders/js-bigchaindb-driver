import topsortTransactions from '../../src/utils/topologySorting'

const driver = require('bigchaindb-driver') // eslint-disable-line import/no-unresolved
require('dotenv').config()

/* let result = driver.Transaction.ccJsonLoad('test')
console.log(result) */

// ======== Preparation ======== //
const conn = new driver.Connection('https://test.bigchaindb.com/api/v1/', {
    app_id: process.env.BIGCHAINDB_APP_ID,
    app_key: process.env.BIGCHAINDB_APP_KEY
})

const alice = new driver.Ed25519Keypair()
const bob = new driver.Ed25519Keypair()
const charles = new driver.Ed25519Keypair()

const assetdata = {
    'bicycle': {
        'serial_number': 'abcd1234',
        'manufacturer': 'Bicycle Inc.',
    }
}

const metadata = { 'planet': 'earth' }


// ======== Create Transaction Bicycle ======== //
const txCreateAliceSimple = driver.Transaction.makeCreateTransaction(
    assetdata,
    metadata,
    [
        driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(alice.publicKey))
    ],
    alice.publicKey
)

const txCreateAliceSimpleSigned =
    driver.Transaction.signTransaction(txCreateAliceSimple, alice.privateKey)


// ======== Post Transaction and Fetch Result ======== //
conn.postTransaction(txCreateAliceSimpleSigned)
    // Check status of transaction every 0.5 seconds until fulfilled
    .then(() => conn.pollStatusAndFetchTransaction(txCreateAliceSimpleSigned.id))


// ======== Transfer Bicycle to Bob ======== //
    .then(() => {
        const txTransferBob = driver.Transaction.makeTransferTransaction(
            [{ tx: txCreateAliceSimpleSigned, output_index: 0 }],
            [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(bob.publicKey))],
            { price: '100 euro' }
        )

        // Sign transfer transaction with Alice's private key
        const txTransferBobSigned = driver.Transaction.signTransaction(txTransferBob, alice.privateKey)

        return conn.postTransaction(txTransferBobSigned)
    })
    .then(res => conn.pollStatusAndFetchTransaction(res.id))


// ======== Transfer Bicycle to Charles ======== //
    .then((txTransferBob) => {
        const txTransferCharles = driver.Transaction.makeTransferTransaction(
            [{ tx: txTransferBob, output_index: 0 }],
            [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(charles.publicKey))],
            { price: '75 euro' }
        )

        // Sign transfer transaction with Alice's private key
        const txTransferCharlesSigned =
            driver.Transaction.signTransaction(txTransferCharles, bob.privateKey)

        return conn.postTransaction(txTransferCharlesSigned)
    })
    .then(res => conn.pollStatusAndFetchTransaction(res.id))


// ======== Topsort bicycle asset ======== //
    // Retrieve all transactions for asset
    .then(() => conn.listTransactions(txCreateAliceSimpleSigned.id, 'TRANSFER'))
    .then(txArray => topsortTransactions(txArray))
    .then(sortedTxs => console.log(sortedTxs)) // eslint-disable-line no-console
