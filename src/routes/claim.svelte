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

	let totalClaimableRewards = 0;

	let lastEpochsAPY = 0;

	onMount(async () => {
		let web3 = new Web3('https://localhost:8545');

		const contractAddress = '0x7bFBfB828d65aB527d49cDe6317a73c136e47992';
		let contract = new web3.eth.Contract(contractABI, contractAddress);
	});
</script>

<div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Rewards Overview -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
		<!-- Total Locked Value -->
		<div
			class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
		>
			<h2 class="text-xl font-medium mb-2">Total Locked Value</h2>
			<p class="text-3xl font-bold">{tvl}</p>
		</div>
		<!-- Total Claimable Rewards -->
		<div
			class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
		>
			<h2 class="text-xl font-medium mb-2">Total Claimable Rewards</h2>
			<p class="text-3xl font-bold">{totalClaimableRewards}</p>
		</div>
		<!-- Last Epoch's APY -->
		<div
			class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
		>
			<h2 class="text-xl font-medium mb-2">Last Epoch's APY</h2>
			<p class="text-3xl font-bold">{lastEpochsAPY}</p>
		</div>
	</div>
	<!-- Claims Section -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<!-- Claimable Rewards -->
		<div
			class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
		>
			<!-- Content goes here -->
		</div>
		<!-- Claim Summary -->
		<div
			class="bg-white drop-shadow-[0_14px_10px_rgba(0,0,0,0.1)] rounded-xl p-8 text-gray-500 font-light"
		>
			<!-- Content goes here -->
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
