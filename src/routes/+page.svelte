<script>
	import { onMount } from 'svelte';
	import {
		connected,
		defaultEvmStores,
		makeContractStore,
		selectedAccount,
		web3,
	} from 'svelte-web3';
	// import { hover } from 'svelte/actions';
	import { readable } from 'svelte/store';
	import Web3 from 'web3';
	import contractABI from './abi.js';

	// Wallet Connection

	let currentPage = 'lock';

	const switchPage = (page) => {
		currentPage = page;
	};

	const handleEvent = async (error, event) => {
		if (error) console.error(error);
		console.log(event);
		await updateBidsAndAsks();
	};

	const calcVolume = (pay_gem, buy_gem, take_amt, give_amt) => {
		let usdVolume = 0;
		let ethVolume = 0;

		if (pay_gem === base.address) {
			ethVolume += web3.utils.fromWei(take_amt, 'ether');
		} else if (pay_gem === quote.address) {
			usdVolume += web3.utils.fromWei(take_amt, 'ether');
		}

		if (buy_gem === base.address) {
			ethVolume += web3.utils.fromWei(give_amt, 'ether');
		} else if (buy_gem === quote.address) {
			usdVolume += web3.utils.fromWei(give_amt, 'ether');
		}

		updateCurrVolume(usdVolume, ethVolume);
	};

	onMount(async () => {
		let web3 = new Web3('https://localhost:8545');

		const contractAddress = '0x7bFBfB828d65aB527d49cDe6317a73c136e47992';
		let contract = new web3.eth.Contract(contractABI, contractAddress);
		isConnected = $connected;

		contract.events.LogMake({ fromBlock: 0 }, handleEvent);
		contract.events.LogBump({ fromBlock: 0 }, handleEvent);
		contract.events.LogKill({ fromBlock: 0 }, handleEvent);
		contract.events.LogTake(
			{
				fromBlock: 0,
			},
			(error, event) => {
				if (error) console.error(error);
				console.log(event);

				const { pay_gem, buy_gem, take_amt, give_amt } =
					event.returnValues;
				calcVolume(pay_gem, buy_gem, take_amt, give_amt);
			}
		);
	});

	// const handleMouseEnter = () => isHovering = true;
	// const handleMouseLeave = () => isHovering = false;

	async function toggleConnection() {
		if (!isConnected) {
			if (window.ethereum) {
				try {
					await window.ethereum.request({
						method: 'wallet_requestPermissions',
						params: [{ eth_accounts: {} }],
					});
					await defaultEvmStores.setProvider();
					isConnected = $connected;
					account = $selectedAccount || '';
				} catch (e) {
					console.log(e);
				}
			}
		} else {
			defaultEvmStores.disconnect();
			isConnected = $connected;
		}
	}

	let base = {
		symbol: 'ETH',
		address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
		balance: 0,
		allowance: 0,
		amount: 0,
	};
	let quote = {
		symbol: 'USDC',
		address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
		balance: 0,
		allowance: 0,
		amount: 0,
	};
	let takeBid = {
		amountIn: 0,
		amountOut: 0,
	};
	let takeAsk = {
		amountIn: 0,
		amountOut: 0,
	};

	//frontend order funcitions to be called w/ buttons

	const sendTx = async (method, ...args) => {
		let tx = await contract.methods[method](...args).send({
			from: account,
		});
		console.log(tx);
	};

	const make = async (payToken, buyToken, payAmount, buyAmount) => {
		await sendTx('make', payToken, buyToken, payAmount, buyAmount);
	};

	const take = async (offerId, maxTakeAmount) => {
		await sendTx('take', offerId, maxTakeAmount);
	};

	//update frontend with new orders

	const getOffers = async (getFirstOffer, getNextOffer, offersMethod) => {
		const firstOfferId = await contract.methods[getFirstOffer]().call();
		let offerIds = [firstOfferId];

		let nextOfferId = await contract.methods[getNextOffer](
			firstOfferId
		).call();
		while (nextOfferId != 0) {
			offerIds.push(nextOfferId);
			nextOfferId = await contract.methods[getNextOffer](
				nextOfferId
			).call();
		}

		const offers = await Promise.all(
			offerIds.map(async (offerId) => {
				const offer = await contract.methods[offersMethod](
					offerId
				).call();
				return {
					id: offerId,
					payAmount: offer.pay_amt,
					payToken: offer.pay_gem,
					buyAmount: offer.buy_amt,
					buyToken: offer.buy_gem,
					owner: offer.owner,
				};
			})
		);

		return offers;
	};

	const getBidOffers = () =>
		getOffers('getFirstUnsortedOffer', 'getNextUnsortedOffer', 'offers');
	const getAskOffers = () =>
		getOffers('getBestOffer', 'getWorseOffer', 'offers');

	const updateBidsAndAsks = async () => {
		const bidOffers = await getBidOffers();
		const askOffers = await getAskOffers();

		bids = bidOffers.map(mapOfferToOrder);
		asks = askOffers.map(mapOfferToOrder);
	};

	const mapOfferToOrder = (offer) => {
		return {
			id: offer.id,
			amount: offer.payAmount,
			token: offer.payToken,
			price: calculatePrice(offer.buyAmount, offer.payAmount),
			owner: offer.owner,
		};
	};

	let coinToLock = ''; // input value for coin to lock
	let selectedOption = '4'; // initialize with default value for 2 Years

	let optionFeeShares = {
		'1': '0.00%',
		'2': '5%',
		'3': '20%',
		'4': '30%',
		'5': '45%',
	};

	let optionVotePowers = {
		'1': '1',
		'2': '5',
		'3': '10',
		'4': '20',
		'5': '40',
	};

	function getOptionFeeShare(option) {
		return optionFeeShares[option];
	}

	function getOptionVotePower(option) {
		return optionVotePowers[option];
	}

	// function getOptionFeeShare(option) {
	// 	switch (option) {
	// 		case '1':
	// 			return '0.00%';
	// 		case '2':
	// 			return '5%';
	// 		case '3':
	// 			return '20%';
	// 		case '4':
	// 			return '30%';
	// 		case '5':
	// 			return '45%';
	// 		default:
	// 			return '';
	// 	}
	// }

	// function getOptionVotePower(option) {
	// 	switch (option) {
	// 		case '1':
	// 			return '1';
	// 		case '2':
	// 			return '5';
	// 		case '3':
	// 			return '10';
	// 		case '4':
	// 			return '20';
	// 		case '5':
	// 			return '40';
	// 		default:
	// 			return '';
	// 	}
	// }

	//update volume

	let totalEthVolume = 0;
	let totalUsdVolume = 0;

	const updateCurrVolume = (usdVolume, ethVolume) => {
		totalEthVolume += ethVolume;
		totalUsdVolume += usdVolume;
	};

	//placeholder bids and asks arrays
	let bids = [
		{
			price: '1899.50',
			quantity: '0.54',
		},
		{
			price: '1899.40',
			quantity: '1.81',
		},
		{
			price: '1899.30',
			quantity: '23.92',
		},
		{
			price: '1899.30',
			quantity: '23.92',
		},
		{
			price: '1899.30',
			quantity: '23.92',
		},
	];

	let asks = [
		{
			price: '1900.50',
			quantity: '0.78',
		},
		{
			price: '1900.60',
			quantity: '6.02',
		},
		{
			price: '1900.70',
			quantity: '7.58',
		},
		{
			price: '1900.70',
			quantity: '7.58',
		},
		{
			price: '1900.70',
			quantity: '7.58',
		},
	];

	let pools = [
		{
			base,
			quote,
			bids,
			asks,
			ethVolume: totalEthVolume,
			usdVolume: totalUsdVolume,
		},
	];

	const promptBid = (bid) => {
		takeBid.amountIn = parseFloat(bid.quantity);
		takeBid.amountOut = parseFloat(bid.quantity) * parseFloat(bid.price);
	};

	const promptAsk = (ask) => {
		takeAsk.amountIn = parseFloat(ask.quantity) * parseFloat(ask.price);
		takeAsk.amountOut = parseFloat(ask.quantity);
	};

	const roundAccurately = (number, decimalPlaces) => {
		return Number(
			Math.round(number + 'e' + decimalPlaces) + 'e-' + decimalPlaces
		);
	};

	let selectedTab = 3;

	let amount = 0;
	let isLoading = false;
	let isHovering = false;
	let sendTransaction = false;
	let isSuccess = false;
	let isConnected = false;

	const setSelectedTab = (tab) => {
		selectedTab = tab;
	};

	const flip = () => {
		let oldBase = base;
		base = quote;
		quote = oldBase;
		let oldBids = bids;
		bids = asks;
		asks = oldBids;
		for (let i = 0; i < bids.length; i++) {
			bids[i].price = 1 / bids[i].price;
			bids[i].quantity = 1 / bids[i].quantity;
		}
		for (let i = 0; i < asks.length; i++) {
			asks[i].price = 1 / asks[i].price;
			asks[i].quantity = 1 / asks[i].quantity;
		}
	};

	function hover(node) {
		const handleMouseover = () => (isHovering = true);
		const handleMouseout = () => (isHovering = false);

		node.addEventListener('mouseover', handleMouseover);
		node.addEventListener('mouseout', handleMouseout);

		return {
			destroy() {
				node.removeEventListener('mouseover', handleMouseover);
				node.removeEventListener('mouseout', handleMouseout);
			},
		};
	}

	//
	//veSCH functions
	//
	// uint256[5] private periods = [86400, 15778800, 31557600, 63115200, 126230400];
	// uint256[5] private weights = [1, 5, 10, 20, 40];

    const periods = [86400, 15778800, 31557600, 63115200, 126230400];  // Define your periods array

	const enterLocker = async() => {
        if(selectedOption >= 0 && selected < 5){
            const period = periods[selectedOption - 1];

            await contract.methods.createLocker(amount, period).send({from: accounts[0]});
        }
    } 

	const getLockerIdsByVoter = async (address) => {
		const lockers = await contract.methods
			.getLockerIdsByVoter(address)
			.call();
		const lockerIds = lockers.map((locker) => locker.id);
		return lockerIds;
	};

	const claimFees = async (address) => {
		const lockerIds = await getLockerIds(address);

		for (const lockerId of lockerIds) {
			await contract.methods.claimFees(lockerId).send({ from: account });
		}
	};

	const unlockSCH = async (id, slash) => {
		await contract.methods.unlockSCH(id, slash).send({ from: account });
	};

	const depositFees = async (amount, period) => {
		await contract.methods
			.depositFees(amount, period)
			.send({ from: accounts });
	};

	let tvl = 0;
	//calculate user TVL
	const getUserTVL = async (user) => {
		const userLockers = await contract.methods
			.getLockersByVoter(userAddress)
			.call();
		for (const locker of userLockers) {
			tvl += parseInt(locker.amount);
		}
	};

	let totalClaimableRewards = 303.3;

	let lastEpochAPY = '25%';

	let lockedBalance = '500 veSCH';
	let unlockedBalance = '200 veSCH';
	let pendingLocks = '100 veSCH';
	let epochEndingDate = '2023-06-01';

	// let coinToLock = ''; // input value for coin to lock

	let activeLocks = [
		{ token: 'veSCH', amount: '300 veSCH', endDate: '2023-06-01' },
		// Add more active locks as needed
	];

	let expiredLocks = [
		{ token: 'veSCH', amount: '200 veSCH', endDate: '2023-05-01' },
		// Add more expired locks as needed
	];
</script>

<div
	class="bg-gray-200 min-h-screen flex flex-col justify-center pt-20"
	style="gap: 4em"
>
	<header class="header">
		<div class="box_shadow">
			<div class="rounded-xl p-4 px-10 bg-gray-200 z-10 relative">
				<a href="https://schwap.app">
					<img src="/img/logo.png" width="50" alt="" />
				</a>
			</div>
		</div>
	</header>
	<div class="max-w-[800px] min-h-[400px] m-auto w-11/12 text-black">
		<div>
			<div
				class="grid grid-cols-3 gap-2 sm:gap-5 px-1 sm:px-5 mb-[-10px]"
			>
				<button
					class="flex items-center px-1 sm:px-8 text-xs sm:text-lg rounded-t-2xl py-4 rounded {selectedTab ==
					1
						? 'bg-white'
						: 'bg-gray-100'} flex items-center justify-center drop-shadow-[0_5px_10px_rgba(0,0,0,0.2)]"
					on:click={() => setSelectedTab(1)}
				>
					<i class="gg-align-right" />
					<div class="ml-2">Trade</div>
				</button>
				<button
					class="flex items-center px-1 sm:px-8 text-xs sm:text-lg rounded-t-2xl py-4 rounded {selectedTab ==
					2
						? 'bg-white'
						: 'bg-gray-100'} drop-shadow-[0_5px_10px_rgba(0,0,0,0.2)] flex items-center justify-center"
					on:click={() => setSelectedTab(2)}
				>
					<i class="gg-drop-opacity" />
					<div class="ml-2">Pools</div>
				</button>
				<button
					class="flex items-center px-1 sm:px-8 text-xs sm:text-lg rounded-t-2xl py-4 rounded {selectedTab ==
					3
						? 'bg-white'
						: 'bg-gray-100'} drop-shadow-[0_5px_10px_rgba(0,0,0,0.2)] flex items-center justify-center"
					on:click={() => setSelectedTab(3)}
				>
					<i class="gg-mail" />
					<div class="ml-2">veSCH</div>
				</button>
			</div>
			{#if selectedTab === 1}
				<div
					class="drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-t-lg border-none font-light rounded-2xl p-8 rounded text-gray-500 bg-white"
				>
					<div class="flex items-center justify-center">
						<button
							class="hover:text-black btn bg-blue-200 px-3 py-2 rounded-xl cursor-pointer text-md text-blue-700 max-w-[160px] w-full"
							style="font-weight:400"
							on:click={toggleConnection}
							use:hover
						>
							{#if isConnected}
								{$selectedAccount.substring(0, 5) +
									'...' +
									$selectedAccount.substring(
										$selectedAccount.length - 4
									)}
								{#if isHovering}
									Disconnect
								{:else}
									Connected
								{/if}
							{:else}
								Connect Wallet
							{/if}
						</button>
					</div>

					<div class="font-light text-gray-500 bg-white">
						Select Pool
						<br />
					</div>
					<div>
						<div
							class="bg-gray-100 p-1 rounded-xl my-4 flex justify-between w-full"
						>
							<div class="pair input_wrap w-full">
								<button
									class="bg-white px-2 py-1 rounded-xl cursor-pointer text-xl w-full"
									disabled={isLoading || !sendTransaction}
								>
									{base.symbol}
								</button>
								<button
									class="bg-transparent px-2 py-1 rounded-xl cursor-default text-xl"
								>
									<i class="gg-arrow-align-h" />
								</button>
								<button
									class="bg-white px-2 py-1 rounded-xl cursor-pointer text-xl w-full"
									disabled={isLoading || !sendTransaction}
								>
									{quote.symbol}
								</button>
							</div>
						</div>
						<div class="font-light text-gray-500 bg-white">
							Maker Panel
						</div>
						<div class="cols flex-col sm:flex-row">
							<div class="max-w-[350px] w-full">
								<div
									class="bg-gray-100 p-1 rounded-xl my-4 flex justify-between w-full"
								>
									<div class="flex input_wrap">
										<button
											class="bg-white px-2 py-1 rounded-xl cursor-pointer text-xl"
											disabled={isLoading ||
												!sendTransaction}
										>
											{base.symbol}
										</button>
										<input
											class="bg-transparent px-1 outline-none w-full text-xl"
											placeholder="0.05"
											bind:value={base.amount}
											on:change={(e) => {
												/^\d*\.?\d{0,18}$/.test(
													e.currentTarget.value
												) && setAmount(e.target.value);
											}}
										/>
									</div>
								</div>
							</div>
							<button
								class="bg-transparent px-2 py-1 rounded-xl cursor-pointer text-xl"
								on:click={flip}
							>
								<i class="gg-swap" />
							</button>
							<div class="max-w-[350px] w-full">
								<div
									class="bg-gray-100 p-1 rounded-xl my-4 flex justify-between w-full"
								>
									<div class="flex input_wrap">
										<button
											class="bg-white px-2 py-1 rounded-xl cursor-pointer text-xl"
											disabled={isLoading ||
												!sendTransaction}
										>
											{quote.symbol}
										</button>
										<input
											class="bg-transparent px-1 outline-none w-full text-xl"
											placeholder="0.05"
											bind:value={quote.amount}
											on:change={(e) => {
												/^\d*\.?\d{0,18}$/.test(
													e.currentTarget.value
												) && setAmount(e.target.value);
											}}
										/>
									</div>
								</div>
							</div>

							<!-- Make Order Button -->
							<button
								class="btn bg-blue-200 px-3 py-2 rounded-xl cursor-pointer text-md text-blue-700 max-w-[120px] w-full"
								style="font-weight: 400"
								on:click={() =>
									make(
										quote.amount,
										base.amount,
										quote.symbol,
										base.symbol
									)}
							>
								Make&nbsp;Order
							</button>
						</div>
						<div class="font-light text-gray-500 bg-white">
							Taker Panel
						</div>
						<div class="cols flex-col sm:flex-row">
							<div class="max-w-[350px] w-full">
								<div
									class="bg-gray-100 p-1 rounded-xl my-4 flex justify-between w-full"
								>
									<div class="flex input_wrap">
										<button
											class="bg-white px-2 py-1 rounded-xl cursor-pointer text-xl"
											disabled={isLoading ||
												!sendTransaction}
										>
											{base.symbol}
										</button>
										<input
											class="bg-transparent px-1 outline-none w-full text-xl"
											placeholder="0.05"
											bind:value={takeBid.amountIn}
											on:change={(e) => {
												/^\d*\.?\d{0,18}$/.test(
													e.currentTarget.value
												) && setAmount(e.target.value);
											}}
										/>
									</div>
								</div>
							</div>
							<button
								class="bg-transparent px-2 py-1 rounded-xl cursor-default text-xl"
							>
								<i class="gg-arrow-right" />
							</button>
							<div class="max-w-[350px] w-full">
								<div
									class="bg-gray-100 p-1 rounded-xl my-4 flex justify-between w-full"
								>
									<div class="flex input_wrap">
										<button
											class="bg-white px-2 py-1 rounded-xl cursor-pointer text-xl"
											disabled={isLoading ||
												!sendTransaction}
										>
											{quote.symbol}
										</button>
										<input
											class="bg-transparent px-1 outline-none w-full text-xl"
											placeholder="0.05"
											bind:value={takeBid.amountOut}
											on:change={(e) => {
												/^\d*\.?\d{0,18}$/.test(
													e.currentTarget.value
												) && setAmount(e.target.value);
											}}
										/>
									</div>
								</div>
							</div>
							<button
								class="btn bg-red-200 px-3 py-2 rounded-xl cursor-pointer text-md text-red-700 max-w-[120px] w-full"
								style="font-weight: 400"
								on:click={() => take(id, takeBid.amountOut)}
							>
								Take&nbsp;Bid
							</button>
						</div>
						<div class="cols flex-col sm:flex-row">
							<div class="max-w-[350px] w-full">
								<div
									class="bg-gray-100 p-1 rounded-xl my-4 flex justify-between w-full"
								>
									<div class="flex input_wrap">
										<button
											class="bg-white px-2 py-1 rounded-xl cursor-pointer text-xl"
											disabled={isLoading ||
												!sendTransaction}
										>
											{quote.symbol}
										</button>
										<input
											class="bg-transparent px-1 outline-none w-full text-xl"
											placeholder="0.05"
											bind:value={takeAsk.amountIn}
											on:change={(e) => {
												/^\d*\.?\d{0,18}$/.test(
													e.currentTarget.value
												) && setAmount(e.target.value);
											}}
										/>
									</div>
								</div>
							</div>
							<button
								class="bg-transparent px-2 py-1 rounded-xl cursor-default text-xl"
							>
								<i class="gg-arrow-right" />
							</button>
							<div class="max-w-[350px] w-full">
								<div
									class="bg-gray-100 p-1 rounded-xl my-4 flex justify-between w-full"
								>
									<div class="flex input_wrap">
										<button
											class="bg-white px-2 py-1 rounded-xl cursor-pointer text-xl"
											disabled={isLoading ||
												!sendTransaction}
										>
											{base.symbol}
										</button>
										<input
											class="bg-transparent px-1 outline-none w-full text-xl"
											placeholder="0.05"
											bind:value={takeAsk.amountOut}
											on:change={(e) => {
												/^\d*\.?\d{0,18}$/.test(
													e.currentTarget.value
												) && setAmount(e.target.value);
											}}
										/>
									</div>
								</div>
							</div>
							<button
								class="btn bg-green-200 px-3 py-2 rounded-xl cursor-pointer text-md text-green-700 max-w-[120px] w-full"
								style="font-weight: 400"
								on:click={() => take(id, takeAsk.amountOut)}
							>
								Take&nbsp;Ask
							</button>
						</div>
						<div
							class="flex flex-col sm:flex-row sm:justify-between w-full my-4"
						>
							<div>
								<div class="orders orders-bids">
									{#each bids.slice(0, 3) as bid}
										<div
											class="order"
											on:click={() => promptBid(bid)}
										>
											<span class="price"
												>{roundAccurately(
													bid.price,
													5
												)}</span
											>
											<span class="amount"
												>{roundAccurately(
													bid.quantity,
													2
												)}</span
											>
										</div>
									{/each}
								</div>
							</div>
							<div class="best best-bid">
								<span class="text">Highest Bid</span>
								<span class="price">
									<!-- {bids[0].price} -->

									{roundAccurately(bids[0].price, 5)}

									<!-- {bids[0].price > 0
										? parseFloat(bids[0].price).toFixed(2)
										: parseFloat(bids[0].price).toFixed(
												7
										  )} -->
								</span>
							</div>
							<div class="best best-ask">
								<span class="text">Lowest Ask</span>
								<span class="price">
									{roundAccurately(asks[0].price, 5)}
								</span>
							</div>
							<div>
								<div class="orders orders-asks">
									{#each asks.slice(0, 3) as ask}
										<div
											class="order"
											on:click={() => promptAsk(ask)}
										>
											<span class="price"
												>{roundAccurately(
													ask.price,
													5
												)}</span
											>
											<span class="amount"
												>{roundAccurately(
													ask.quantity,
													2
												)}
											</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else if selectedTab === 2}
				<div
					class="drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-t-lg border-none font-light rounded-2xl p-8 rounded text-gray-500 bg-white"
				>
					<div class="pools">
						{#each pools as pool}
							<div
								class="bg-gray-100 rounded-lg p-4 pool"
								on:click={() => setSelectedTab(1)}
							>
								<div class="flex justify-between items-center">
									<div>
										<h2 class="text-2xl">
											{pool.base.symbol}/{pool.quote
												.symbol}
										</h2>
										<p>
											{pool.base.address.substring(
												0,
												6
											)}.../{pool.quote.address.substring(
												0,
												6
											)}...
										</p>
									</div>
									<div>
										<span class="text-green-600"
											>{pool.bids[0].price}</span
										>
										/
										<span class="text-red-600"
											>{pool.asks[0].price}</span
										>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if selectedTab === 3}
				<div
					class="drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-t-lg border-none font-light rounded-2xl p-8 rounded text-gray-500 bg-white"
				>
					<nav class="flex justify-between items-center my-8">
						<div>
							<button
								class="px-4 py-2 mx-2  bg-transparent {currentPage ===
								'lock'
									? 'text-blue-500'
									: 'text-black'}"
								on:click={() => switchPage('lock')}
							>
								<span class="relative z-10">Lock</span>
							</button>
							<button
								class="px-4 py-2 mx-2 bg-transparent {currentPage ===
								'claim'
									? 'text-blue-500'
									: 'text-black'}"
								on:click={() => switchPage('claim')}
							>
								<span class="relative z-10">Claim</span>
							</button>
						</div>
						<button
							class="hover:text-black btn bg-blue-200 px-3 py-2 rounded-xl cursor-pointer text-md text-blue-700 max-w-[160px] w-full"
							style="font-weight:400"
							on:click={toggleConnection}
							use:hover
						>
							{#if isConnected}
								{$selectedAccount.substring(0, 5) +
									'...' +
									$selectedAccount.substring(
										$selectedAccount.length - 4
									)}
								{#if isHovering}
									Disconnect
								{:else}
									Connected
								{/if}
							{:else}
								Connect Wallet
							{/if}
						</button>
					</nav>

					{#if currentPage === 'lock'}
						<div
							class="container mx-auto px-4 sm:px-6 lg:px-8 py-8"
						>
							<!-- Position Overview -->
							<div
								class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8"
							>
								<!-- Locked Balance -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light flex flex-col justify-center items-center"
								>
									<h2 class="text-xs font-medium mb-2">
										Locked Balance
									</h2>
									<p class="text-lg font-bold">
										{lockedBalance}
									</p>
								</div>

								<!-- Unlocked Balance -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light flex flex-col justify-center items-center"
								>
									<h2 class="text-xs font-medium mb-2">
										Unlocked Balance
									</h2>
									<p class="text-lg font-bold">
										{unlockedBalance}
									</p>
								</div>

								<!-- Pending Locks -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light flex flex-col justify-center items-center"
								>
									<h2 class="text-xs font-medium mb-2">
										Pending Locks
									</h2>
									<p class="text-lg font-bold">
										{pendingLocks}
									</p>
								</div>

								<!-- Epoch Ending Date -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light flex flex-col justify-center items-center"
								>
									<h2 class="text-xs font-medium mb-2">
										Epoch Ending
									</h2>
									<p class="text-lg font-bold">
										{epochEndingDate}
									</p>
								</div>
							</div>

							<!-- Coin Locker -->
							<div
								class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light mb-8"
							>
								<div
									class="flex items-center justify-between mb-4"
								>
									<div class="flex items-center w-1/2">
										<input
											bind:value={coinToLock}
											class="border-2 rounded-lg p-2 mr-2 w-full"
											placeholder="Enter amount to lock"
										/>
										<button
											class="bg-blue-500 text-white rounded-lg py-2 px-4"
											>MAX</button
										>
									</div>
									<select
										class="border-2 rounded-lg p-2 w-1/2 ml-4"
										bind:value={selectedOption}
									>
										<option value="1">1 Day</option>
										<option value="2">6 Months</option>
										<option value="3">1 Year</option>
										<option value="4" selected
											>2 Years</option
										>
										<option value="5">4 Years</option>
									</select>
								</div>
								{#if selectedOption}
									<div
										class="flex items-center justify-between mb-2"
									>
										<div class="flex items-center">
											<p class="text-lg">
												<span class=" text-lg"
													>Fee Share:</span
												>
												<span
													class="font-medium text-lg"
													>{getOptionFeeShare(
														selectedOption
													)}</span
												>
											</p>
											<p class="text-lg ml-4">
												<span class="text-lg"
													>Vote Power / SCH:</span
												>
												<span
													class="font-medium text-lg"
													>{getOptionVotePower(
														selectedOption
													)}</span
												>
											</p>
										</div>
										<button
											class="bg-blue-500 text-white rounded-lg py-2 px-16"
                                            on:click={enterLocker}
											>Enter Locker</button
										>
									</div>
								{/if}
							</div>

							<!-- Active Locks and Expired Locks -->
							<div class="grid grid-cols-2 gap-4">
								<!-- Active Locks -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
								>
									<h2
										class="text-lg font-medium mb-2 text-center text-green-700"
									>
										Active Locks
									</h2>

									<table class="w-full">
										<thead>
											<tr>
												<th class="font-medium"
													>Amount</th
												>
												<th class="font-medium"
													>End Date</th
												>
											</tr>
										</thead>
										<tbody>
											{#each activeLocks as lock}
												<tr>
													<td class="text-center"
														>{lock.amount}</td
													>
													<td class="text-center"
														>{lock.endDate}</td
													>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>

								<!-- Expired Locks -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
								>
									<h2
										class="text-lg font-medium mb-2 text-center text-red-700"
									>
										Expired Locks
									</h2>
									<table class="w-full">
										<thead>
											<tr>
												<th class="font-medium"
													>Amount</th
												>
												<th class="font-medium"
													>End Date</th
												>
											</tr>
										</thead>
										<tbody>
											{#each expiredLocks as lock}
												<tr>
													<td class="text-center"
														>{lock.amount}</td
													>
													<td class="text-center"
														>{lock.endDate}</td
													>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					{:else if currentPage === 'claim'}
						<div
							class="container mx-auto px-4 sm:px-6 lg:px-8 py-8"
						>
							<!-- Rewards Overview -->
							<div
								class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
							>
								<!-- Total Locked Value -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light flex flex-col justify-center items-center"
								>
									<h2 class="text-sm font-medium mb-2">
										Total Locked Value
									</h2>
									<p class="text-lg font-bold">1000</p>
								</div>

								<!-- Total Claimable Rewards -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light flex flex-col justify-center items-center"
								>
									<h2 class="text-sm font-medium mb-2">
										Total Claimable Rewards
									</h2>
									<p class="text-lg font-bold">33.37</p>
								</div>

								<!-- Last Epoch's APY -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light flex flex-col justify-center items-center"
								>
									<h2 class="text-sm font-medium mb-2">
										Last Epoch's APY
									</h2>
									<p class="text-lg font-bold">843.53%</p>
								</div>
							</div>

							<!-- Claims Section -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<!-- Claimable Rewards -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
								>
									<h2 class="text-lg font-medium mb-2">
										Claimable Rewards:
									</h2>
									<!-- list of claimable rewards -->
									<div>
										<!-- {#each totalClaimableRewards as reward}
									<div class="my-2">
										<span class="font-medium"
											>SCH</span
										>: <span>0</span>
									</div>
								{/each} -->
									</div>
								</div>

								<!-- Claim Summary -->
								<div
									class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
								>
									<h2 class="text-lg font-medium mb-2">
										Claim Summary: ...
									</h2>
									<!-- claim summary details -->
									<div>
										<!-- insert claim summary details here -->
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<div class="flex justify-center mb-20">
		<div class="flex gap-2 sm:gap-4">
			<div class="box_shadow">
				<div class="rounded-xl p-2 sm:p-4 bg-gray-200 relative z-10">
					<a
						href="http://twitter.com/0xSchwap"
						rel="noreferrer"
						target="_blank"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							xmlns:xlink="http://www.w3.org/1999/xlink"
							aria-hidden="true"
							role="img"
							class="iconify iconify--mdi"
							width="25"
							height="25"
							viewBox="0 0 24 24"
							style="color: gray;"
							><path
								fill="currentColor"
								d="M22.46 6c-.77.35-1.6.58-2.46.69c.88-.53 1.56-1.37 1.88-2.38c-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29c0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15c0 1.49.75 2.81 1.91 3.56c-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07a4.28 4.28 0 0 0 4 2.98a8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21C16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56c.84-.6 1.56-1.36 2.14-2.23Z"
							/></svg
						>
						<!--<Icon icon="mdi:twitter" width="25" color="gray" />-->
					</a>
				</div>
			</div>
			<div class="box_shadow">
				<div class="rounded-xl p-2 sm:p-4 bg-gray-200 relative z-10">
					<a
						href="http://twitter.com/0xSchwap"
						rel="noreferrer"
						target="_blank"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							xmlns:xlink="http://www.w3.org/1999/xlink"
							aria-hidden="true"
							role="img"
							class="iconify iconify--ic"
							width="25"
							height="25"
							viewBox="0 0 24 24"
							style="color: gray;"
							><path
								fill="currentColor"
								d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"
							/></svg
						>
						<!--<Icon icon="ic:baseline-discord" width="25" color="gray" />-->
					</a>
				</div>
			</div>
			<div class="box_shadow">
				<div class="rounded-xl p-2 sm:p-4 bg-gray-200 relative z-10">
					<a
						href="http://twitter.com/0xSchwap"
						rel="noreferrer"
						target="_blank"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							xmlns:xlink="http://www.w3.org/1999/xlink"
							aria-hidden="true"
							role="img"
							class="iconify iconify--simple-icons"
							width="25"
							height="25"
							viewBox="0 0 24 24"
							style="color: gray;"
							><path
								fill="currentColor"
								d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11L22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"
							/></svg
						>
						<!--<Icon icon="simple-icons:substack" width="25" color="gray" />-->
					</a>
				</div>
			</div>
			<div class="box_shadow">
				<div class="rounded-xl p-2 sm:p-4 bg-gray-200 relative z-10">
					<a
						href="http://twitter.com/0xSchwap"
						rel="noreferrer"
						target="_blank"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							xmlns:xlink="http://www.w3.org/1999/xlink"
							aria-hidden="true"
							role="img"
							class="iconify iconify--simple-icons"
							width="25"
							height="25"
							viewBox="0 0 24 24"
							style="color: gray;"
							><path
								fill="currentColor"
								d="M10.802 17.77a.703.703 0 1 1-.002 1.406a.703.703 0 0 1 .002-1.406m11.024-4.347a.703.703 0 1 1 .001-1.406a.703.703 0 0 1-.001 1.406m0-2.876a2.176 2.176 0 0 0-2.174 2.174c0 .233.039.465.115.691l-7.181 3.823a2.165 2.165 0 0 0-1.784-.937c-.829 0-1.584.475-1.95 1.216l-6.451-3.402c-.682-.358-1.192-1.48-1.138-2.502c.028-.533.212-.947.493-1.107c.178-.1.392-.092.62.027l.042.023c1.71.9 7.304 3.847 7.54 3.956c.363.169.565.237 1.185-.057l11.564-6.014c.17-.064.368-.227.368-.474c0-.342-.354-.477-.355-.477c-.658-.315-1.669-.788-2.655-1.25c-2.108-.987-4.497-2.105-5.546-2.655c-.906-.474-1.635-.074-1.765.006l-.252.125C7.78 6.048 1.46 9.178 1.1 9.397C.457 9.789.058 10.57.006 11.539c-.08 1.537.703 3.14 1.824 3.727l6.822 3.518a2.175 2.175 0 0 0 2.15 1.862a2.177 2.177 0 0 0 2.173-2.14l7.514-4.073c.38.298.853.461 1.337.461A2.176 2.176 0 0 0 24 12.72a2.176 2.176 0 0 0-2.174-2.174"
							/></svg
						>
						<!--<Icon icon="simple-icons:gitbook" width="25" color="gray" />-->
					</a>
				</div>
			</div>
			<div class="box_shadow">
				<div class="rounded-xl p-2 sm:p-4 bg-gray-200 relative z-10">
					<a
						href="https://github.com/0xschwap"
						rel="noreferrer"
						target="_blank"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							xmlns:xlink="http://www.w3.org/1999/xlink"
							aria-hidden="true"
							role="img"
							class="iconify iconify--mdi"
							width="25"
							height="25"
							viewBox="0 0 24 24"
							style="color: gray;"
							><path
								fill="currentColor"
								d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"
							/></svg
						>
						<!--<Icon icon="mdi:github" width="25" color="gray" />-->
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	/*
    input {
        transition: filter 0.2s ease-out, box-shadow 0.1s ease-in;
        &:active, &:focus {
            box-shadow: 0 0 0 0.2rem rgba(29, 78, 216, .25);
        }
    }
    */
	.locker {
		cursor: pointer;
		transition: filter 0.2s ease-out, box-shadow 0.1s ease-in;
		max-width: 232px;
		width: 100%;
		&:hover {
			filter: brightness(0.96);
		}
	}
	.btn {
		transition: filter 0.2s ease-out, box-shadow 0.1s ease-in;
		&:hover {
			filter: brightness(1.1);
		}
		&:active,
		&:focus {
			box-shadow: 0 0 0 0.2rem rgba(29, 78, 216, 0.25);
		}
		&.text-red-700 {
			&:active,
			&:focus {
				box-shadow: 0 0 0 0.2rem rgba(185, 28, 28, 0.25);
			}
		}
		&.text-green-700 {
			&:active,
			&:focus {
				box-shadow: 0 0 0 0.2rem rgba(21, 128, 61, 0.25);
			}
		}
	}
	.pool {
		cursor: pointer;
		transition: filter 0.2s ease-out, box-shadow 0.1s ease-in;
		&:hover {
			filter: brightness(0.96);
		}
	}
	.orders {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
		.order {
			align-items: center;
			border-radius: 0.25rem;
			cursor: pointer;
			display: flex;
			justify-content: space-between;
			padding: 4px 8px;
			transition: filter 0.2s ease-out, box-shadow 0.1s ease-in;
			width: 200px;
			&:hover {
				filter: brightness(1.1);
			}
		}
		&.orders-bids {
			.order {
				background: #bbf7d0;
				color: #15803d;
				&:active,
				&:focus {
					box-shadow: 0 0 0 0.2rem rgba(21, 128, 61, 0.25);
				}
			}
		}
		&.orders-asks {
			.order {
				flex-direction: row-reverse;
				background: #fecaca;
				color: #b91c1c;
				&:active,
				&:focus {
					box-shadow: 0 0 0 0.2rem rgba(185, 28, 28, 0.25);
				}
			}
		}
	}
	.best {
		align-items: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
		text-align: center;
		.text {
		}
		.price {
			font-size: 18px;
			font-weight: 500;
		}
		&.best-bid {
			.price {
				color: #16a34a;
			}
		}
		&.best-ask {
			.price {
				color: #dc2626;
			}
		}
	}
</style>
