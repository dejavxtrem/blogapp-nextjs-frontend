import { API, Storage, Auth, Hub } from "aws-amplify";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ReactMarkDown from "react-markdown";
import "../../configureAmplify";
import dynamic from "next/dynamic";
import { listPosts, getPost } from "../../src/graphql/queries";
//import Image from "next/image";
import { createComment } from "../../src/graphql/mutations";

import { v4 as uuid } from "uuid";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
	ssr: false,
});
import "easymde/dist/easymde.min.css";

const initialState = { message: "" };

const Post = ({ post }) => {
	const [signedInUser, setSignedInUser] = useState(false);
	const [coverImage, setCoverImage] = useState(null);
	const [comment, setComment] = useState(initialState);
	const [showMe, setShowMe] = useState(false);

	const toggle = () => {
		setShowMe(!showMe);
	};

	const router = useRouter();

	const { message } = comment;

	async function authListener() {
		Hub.listen("auth", (data) => {
			switch (data.payload.event) {
				case "signIn":
					return setSignedInUser(true);
				case "signOut":
					return setSignedInUser(false);
			}
		});
		try {
			await Auth.currentAuthenticatedUser();
			setSignedInUser(true);
		} catch (err) {}
	}

	useEffect(() => {
		authListener();
	}, []);

	const updatedCoverImage = async () => {
		try {
			// check if the image exist if it does get it from s3 bucket
			if (post.coverImage) {
				const imageKey = await Storage.get(post.coverImage);
				setCoverImage(imageKey);
			}
		} catch (error) {
			console.log(error);
		}
	};

	const createTheComment = async () => {
		try {
			if (!message) return;
			const id = uuid();
			comment.id = id;
			await API.graphql({
				query: createComment,
				variables: { input: comment },
				authMode: "AMAZON_COGNITO_USER_POOLS",
			});
		} catch (error) {
			console.log(error);
		}
		router.push("/my-posts");
	};

	useEffect(() => {
		updatedCoverImage();
	}, []);

	if (router.isFallback) {
		return (
			<div>
				<h1>Loading</h1>
			</div>
		);
	}

	console.log(coverImage);

	return (
		<div>
			<h1 className="text-5xl mt-4 font-semibold tracing-wide">
				{post.title}
			</h1>
			{coverImage && (
				<img
					src={coverImage}
					className="mt-4"
					alt="Image"
					width={600}
					height={400}
				/>
			)}

			<p className="text-sm font-light my-4">By {post.username}</p>
			<div className="mt-8">
				<ReactMarkDown
					className="prose"
					// eslint-disable-next-line react/no-children-prop
					children={post.content}
				></ReactMarkDown>
			</div>

			<div>
				{signedInUser && (
					<button
						type="button"
						className="mb-4 bg-green-600 
        text-white font-semibold px-8 py-2 rounded-lg"
						onClick={toggle}
					>
						Write a Comment
					</button>
				)}

				{
					<div style={{ display: showMe ? "block" : "none" }}>
						<SimpleMDE
							value={comment.message}
							onChange={(value) =>
								setComment({
									...comment,
									message: value,
									postID: post.id,
								})
							}
						/>
						<button
							onClick={createTheComment}
							type="button"
							className="mb-4 bg-blue-600 text-white font-semibold px-8 py-2 rounded-lg"
						>
							Save
						</button>
					</div>
				}
			</div>
		</div>
	);
};

export default Post;

//go to listpost query and get the ID and store in params
export async function getStaticPaths() {
	const postData = await API.graphql({
		query: listPosts,
	});
	const paths = postData.data.listPosts.items.map((post) => ({
		params: { id: post.id },
	}));
	return {
		paths,
		fallback: true,
	};
}

// call the get post query andpass the id from params as the input then store the value in props
export async function getStaticProps({ params }) {
	const { id } = params;
	const postData = await API.graphql({
		query: getPost,
		variables: { id },
	});
	return {
		props: {
			post: postData.data.getPost,
		},
		revalidate: 1,
	};
}
