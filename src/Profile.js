import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button, Card, Col } from 'react-bootstrap'
import { create as ipfsHttpClient } from 'ipfs-http-client'
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0') 
//to store the metadata of the NFT profile that users can create from the profiles component


const App = ({ contract}) => {
    const [profile, setProfile] = useState('')
    const [nfts, setNfts] = useState('')
    const [avatar, setAvatar] = useState(null)
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(true)
    //a function to load all user's NFTs
    const loadMyNFTs = async () => {
        // Get users nft ids
        const results = await contract.getMyNfts();
        // Fetch metadata of each nft and add that to nft object.
        let nfts = await Promise.all(results.map(async i => {
            // get uri url of nft
            const uri = await contract.tokenURI(i)
            // fetch nft metadata
            const response = await fetch(uri) //js fetch api
            const metadata = await response.json()
            //returning the NFT object, id of the entity, metadata from ipfs
            return ({
                id: i,
                username: metadata.username,
                avatar: metadata.avatar
            })
        }))
        setNfts(nfts)
        getProfile(nfts)
    }

    //this function filters through the NFTs to determine which one is the representative of the user's profile
    const getProfile = async (nfts) => {
        //getting the address of the account connected to the app (metamask current account)
        const address = await contract.signer.getAddress()
        //getting the id corresponding to that NFT profile
        const id = await contract.profiles(address)
        //using "find" method to find from NFT array the id that matches 
        const profile = nfts.find((i) => i.id.toString() === id.toString())
        setProfile(profile)
        setLoading(false)
    }

    //uploads the image of the avatar or the NFT profile they are minting
    const uploadToIPFS = async (event) => {
        event.preventDefault()
        const file = event.target.files[0]
        if (typeof file !== 'undefined') {
            try {
                //adding file to ipfs
                const result = await client.add(file)
                setAvatar(`https://ipfs.infura.io/ipfs/${result.path}`)
            } catch (error) {
                window.alert("ipfs image upload error: ", error)
            }
        }
    }

    //interacts with the blockchain to mint the profile NFT
    const mintProfile = async (event) => {
        if (!avatar || !username) return
        try {
            //adding username, avatar to IPFS
            const result = await client.add(JSON.stringify({ avatar, username }))
            setLoading(true)
            //calling mint function using metadata and waiting for trasaction receipt to return
            await (await contract.mint(`https://ipfs.infura.io/ipfs/${result.path}`)).wait()
            //waiting for newly minted NFT
            loadMyNFTs()
        } catch (error) {
            window.alert("ipfs uri upload error: ", error)
        }
    }

    //writes data to blockchain which will allow users to switch their profile
    //basically selecting a different NFT that they own to represent their profile
    const switchProfile = async (nft) => {
        setLoading(true)
        await (await contract.setProfile(nft.id)).wait()
        getProfile(nfts)
        //this updates the profile with the newly selected profile
    }
    //when profile mounts i.e. nfts=false
    useEffect(() => {
        if (!nfts) {
            loadMyNFTs()
        }
    })
    if (loading) return (
        <div className='text-center'>
            <main style={{ padding: "1rem 0" }}>
                <h2>Loading...</h2>
            </main>
        </div>
    )
    return (
        //rendering the user's NFT profile
        <div className="mt-4 text-center">
            {profile ? (<div className="mb-3"><h3 className="mb-3">{profile.username}</h3>
                <img className="mb-3" style={{ width: '400px' }} src={profile.avatar} /></div>)
                :
                <h4 className="mb-4">No NFT profile, please create one...</h4>}

            <div className="row">
                <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
                    <div className="content mx-auto">
                        <Row className="g-4">
                            <Form.Control
                                type="file"
                                required
                                name="file"
                                onChange={uploadToIPFS}
                            />
                            <Form.Control onChange={(e) => setUsername(e.target.value)} size="lg" required type="text" placeholder="Username" />
                            <div className="d-grid px-0">
                                <Button onClick={mintProfile} variant="primary" size="lg">
                                    Mint NFT Profile
                                </Button>
                            </div>
                        </Row>
                    </div>
                </main>
            </div>
            <div className="px-5 container">
                <Row xs={1} md={2} lg={4} className="g-4 py-5">
                    {nfts.map((nft, idx) => {
                        if (nft.id === profile.id) return
                        return (
                            <Col key={idx} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={nft.avatar} />
                                    <Card.Body color="secondary">
                                        <Card.Title>{nft.username}</Card.Title>
                                    </Card.Body>
                                    <Card.Footer>
                                        <div className='d-grid'>
                                            <Button onClick={() => switchProfile(nft)} variant="primary" size="lg">
                                                Set as Profile
                                            </Button>
                                        </div>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        )
                    })}
                </Row>
            </div>
        </div>
    );
}

export default App;